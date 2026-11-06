# orca-web

在手机浏览器里接管桌面 Orca 的 agent 任务：看正在跑的项目和会话、读对话、回复、批准或回答提问、
新建任务、中止运行中的回合。

桌面 Orca 保持上游原样、随时可升级。这个仓库只做两件事：**把 RPC 从公网安全地送到家里的
Orca**，以及**给手机一块能用的界面**。

---

## 链路总览

```
┌──────────────┐   HTTPS / WSS    ┌─────────────────────────┐   主动外连 WSS    ┌────────────────┐  loopback WS  ┌────────────┐
│  手机浏览器   │ ───────────────> │  VPS：apps/server        │ <──────────────── │ 家里：gateway  │ ────────────> │ 桌面 Orca  │
│              │ <─────────────── │  登录 + hub + 静态页面    │ ────────────────> │                │ <──────────── │            │
└──────────────┘                  └─────────────────────────┘                   └────────────────┘   E2EE v2     └────────────┘
```

三条不变量，整个设计都建立在上面：

1. **家里那台机器从不监听端口。** 连接永远是它主动拨出去的，所以不需要公网 IP、端口映射、DDNS，
   路由器上也不用开口子。
2. **VPS 不持有 Orca 的凭据。** 它只有网页密码的 hash 和一把 gateway key；没有 device token，
   即使 VPS 被完全拿下，也进不了 Orca。
3. **浏览器只和 VPS 说话。** 桌面 Orca 每个连接的 128 上限，只被 gateway 这一个进程占用。

## 角色

| 进程 | 跑在哪 | 职责 | 凭据 |
| --- | --- | --- | --- |
| `apps/web` | 手机浏览器 | 看板、任务详情、审批卡、输入框 | 会话 cookie |
| `apps/server` | VPS | 登录、会话、静态页面、`/client` 与 `/gateway` 两个 WebSocket、路由与广播 | 密码 hash、gateway key |
| `apps/gateway` | 家里，和桌面 Orca 同机 | 一条到 hub 的外连 + 一条到 Orca 的 loopback 连接，断线重拨、订阅重放 | gateway key、Orca device token |
| 桌面 Orca | 家里 | 真正干活的那个 | — |

---

## 一次交互怎么走

### 0. 登录

1. 浏览器 `POST /api/login`。
2. 服务端用 scrypt 校验密码（`scrypt$N$r$p$salt$hash`），成功后生成一个随机 session key，
   内存与磁盘上只存它的 hash。
3. `Set-Cookie: orca_web_session=…`，`HttpOnly; Secure; SameSite=Strict; Max-Age=30 天`。
4. 失败按 IP 限流：15 分钟内 10 次失败即拒绝。`X-Forwarded-For` 生效是因为 Caddy 前置且
   `trustProxy` 打开。
5. 前端拿到 200 后打开 `wss://<origin>/client`。cookie 随 upgrade 一起发出；`Origin` 必须等于
   `publicOrigin`；没有有效会话直接 401。

### 1. 看板

浏览器发两条 `request`：`project.list` 和 `worktree.ps`。

```
浏览器 ──request──> hub ──request──> gateway ──JSON-RPC──> Orca
浏览器 <─result─── hub <─result─── gateway <──result──── Orca
```

hub 在这里**只做转发和 id 重映射**，不改写结果结构，所以两端协议可以保持近似。

### 2. 实时状态

浏览器 `subscribe agentSession.subscribeStatus`。gateway 把它变成对 Orca 的一条订阅，把
`snapshot` / `status` 帧经 hub 广播给所有已登录的浏览器。

- 首个 `snapshot` 如果是空的，当作“还没 seed 好”，忽略——不是“没有任务”。
- gateway 一断线，前端立刻清空状态叠加层。状态描述的是**活着的连接**，不是历史。
- 另有 `worktree.ps` 15 秒轮询做权威兜底：即使状态流安静，任务开始或结束也会出现。

### 3. 打开任务

`agentSession.history`（一次最多 200 条）+ “载入更早的消息”向上翻页。
待处理的审批和提问从 history 尾部 40 条里恢复。

### 4. 写入：回复、审批、提问、中止、新建

每一次写入都带同一个 mutation envelope：

```json
{
  "sessionId": "…",
  "clientOperationId": "…",
  "expectedRuntimeFence": 17,
  "payloadFingerprint": "…"
}
```

- `clientOperationId` 由浏览器 `crypto.randomUUID()` 生成 → 重试幂等，不会重复执行。
- `expectedRuntimeFence` 是上次读到的 fence → 乐观并发。桌面端如果同时动了同一个会话，
  这次写入会被拒绝，而不是覆盖。
- `payloadFingerprint` 是规范化参数的 SHA-256，Orca 端会再校验一次；审批的指纹方法名是
  `agentSession.respondTo:approval`。

所以“手机上点了批准”不会盖掉你刚在桌面上做的另一个动作，也不会执行两次。

新建任务则先对每个候选 agent 调 `agentSession.createSupport` 探测；`create` 的
`expectedRuntimeFence` 是 `null`，语义是“这个会话现在还不该存在”，可选携带第一条消息。

**会话设置（换模型 / 改权限）**：`agentSession.options` 读出模型目录与当前选择，任务页头部显示
两个胶囊（当前模型、当前权限）；点开一个面板，`agentSession.setOption`（key：`model` /
`permissionMode`，权限值：`ask` / `accept-edits` / `auto` / `full-access` / `own`）带同样的
envelope 写入，成功后重取 history 和 options。改动从下一回合生效。

### 5. 中止

`agentSession.cancel`，如果已经从状态里读到当前回合，就带上它的 turn id；读不到时交给 Orca
按会话当前回合处理。

---

## 断线时发生什么

| 断在哪 | 表现 | 恢复 |
| --- | --- | --- |
| 浏览器 ↔ hub | 顶部提示“正在连接服务器” | 指数退避重连，重连后自动重订阅 |
| hub ↔ gateway | 看板提示“家里电脑未连接”，未完成请求以 `remote_runtime_unavailable` 失败 | gateway 500 ms → 30 s 抖动退避重拨 |
| gateway ↔ Orca | “Orca 已断开” | 等 socket 真正 close 后重拨，Orca 起来后自动接上 |
| VPS 重启 | 手机掉线一下 | 会话 hash 在 `sessionStorePath` 里，重启不掉登录 |

两个细节是踩过坑换来的：

- **重连后先发 `stream-reset`。** 订阅 id 会保留，前端收到 reset 就重新取数，而不是假设断线期间
  没有丢帧。
- **必须等旧 socket 的 close 事件再重拨。** 用定时器盲拨会每次泄漏一个 Orca socket，Orca 到
  128 个连接就拒绝所有人（`1013 Maximum connections reached`），看起来像“Orca 挂了”。

---

## 协议

两层，都是“一条 JSON 文本帧 = 一条消息”。

**浏览器 ↔ hub** — `src/shared/web-protocol.ts`

| 方向 | 帧 |
| --- | --- |
| 浏览器 → hub | `request` / `subscribe` / `unsubscribe` / `ping` |
| hub → 浏览器 | `welcome` / `request-result` / `stream-frame` / `stream-error` / `stream-reset` / `gateway-state` / `pong` |

**gateway ↔ hub** — `src/shared/link-protocol.ts`

| 方向 | 帧 |
| --- | --- |
| gateway → hub | `hello`（key、gatewayId、orcaState）/ `request-result` / `stream-frame` / `stream-error` / `stream-reset` / `orca-state` / `pong` |
| hub → gateway | `welcome` / `request` / `subscribe` / `unsubscribe` / `ping` / `reject` |

hub 是转发器，不是翻译器：它只维护 id 归属、订阅表和 gateway 状态。

**gateway ↔ Orca** 走 Orca 自己的 remote-runtime 协议：JSON-RPC over WebSocket，E2EE v2
握手，`mobile` scope 的 device token。这些实现在 `src/gateway/orca/`，从上游 Orca 的行为反推，
`docs/UPSTREAM.md` 记录了对应的上游文件。

---

## 信任边界

| 段 | 加密 | 谁能看到内容 |
| --- | --- | --- |
| 手机 ↔ VPS | TLS（Let's Encrypt） | 手机、VPS |
| VPS 进程内 | — | **VPS 能看到明文 RPC**（v1 明确接受的取舍） |
| gateway ↔ Orca | E2EE v2 | 家里这台机器、Orca |
| 静态资源 | TLS | 任何人（只是登录页） |

- Orca 的运行时端口不对公网暴露，VPS 也够不到它。
- device token 是 bearer 凭据，等同于密码：它在家里机器的 gateway 配置里，不进仓库、不进日志。
- 单用户、单 gateway。没有多租户，也没有“给朋友开个号”。

---

## 目录

| 路径 | 作用 |
| --- | --- |
| `apps/web/src/Board.tsx` | 项目 → 工作树 → 任务，实时状态与筛选 |
| `apps/web/src/TaskView.tsx` | 对话、审批/提问卡片、回复、停止、翻页 |
| `apps/web/src/CreateTask.tsx` | 新建任务面板 |
| `apps/web/src/Markdown.tsx` | 无依赖的 markdown 子集（含表格） |
| `apps/web/src/hub.ts` | 浏览器端 WebSocket，断线重连 + 重订阅 |
| `apps/server/src/main.ts` | VPS 入口：HTTP + `/client` `/gateway` 两个 WebSocket |
| `apps/server/src/hub.ts` | 请求路由、流广播、gateway 重连后的重放 |
| `apps/server/src/http-app.ts` | 登录、会话、健康检查、静态页面 |
| `apps/gateway/src/main.ts` | 家里 gateway 入口 |
| `apps/gateway/src/local-admin-server.ts` | 回环管理页：配对码、hub 地址/key、连接状态 |
| `apps/gateway/src/hub-link.ts` | 到 VPS 的外连、鉴权、退避、存活判定 |
| `apps/gateway/src/orca-bridge.ts` | 一条活的 Orca 连接：重连、能力重播、订阅重放 |
| `src/gateway/orca/e2ee-v2-client.ts` | E2EE v2 握手与封包 |
| `src/gateway/orca/rpc-client.ts` | 一条已鉴权的 Orca socket，单次调用 + 流式调用 |
| `src/gateway/orca/agent-session.ts` | history / send / cancel / create，含 mutation envelope |
| `src/shared/*.ts` | 两条线上协议的类型与守卫 |
| `scripts/` | 本地开发、配对材料读取、密码 hash、Windows 自启 |
| `design/` | 五套界面原型（已采用 `04-editorial.html`） |
| `docs/DEPLOY.md` | Caddy + systemd + 配对 |
| `docs/UPSTREAM.md` | 上游哪些文件定义了 wire contract |

---

## 本地运行

```bash
npm install

# 对着本机正在跑的桌面 Orca 做只读冒烟（读 %APPDATA%\orca 的配对材料）
node scripts/phase0-smoke.ts

# 本地 hub（不需要部署）+ 本地 gateway
npm run dev:hub -- --once
ORCA_WEB_SERVER_URL=ws://127.0.0.1:8787 \
ORCA_WEB_GATEWAY_KEY=dev-gateway-key \
node apps/gateway/src/main.ts --local-orca

# 构建网页并起服务端
npm run web:build        # → apps/web/dist
npm run server           # 需要 ORCA_WEB_SERVER_CONFIG
npm run gateway
```

网页和服务端同源部署是刻意的：会话 cookie 是 `SameSite=Strict`，换到另一个 Vite 开发源就带不上。
另外 `crypto.subtle`（指纹）和 `crypto.randomUUID`（操作 id）要求安全上下文——`localhost` 算，
纯 HTTP 的局域网 IP 不算，所以线上必须 TLS。

## 部署

两台机器两个进程；凭据和主机名不进仓库。运行时都是**单个打包文件**（esbuild 内联 `ws` 等所有依赖），
机器上只要有 Node 24，不需要 npm install、不需要源码。

从零安装（各一条命令）：

```bash
# VPS：一个单元搞定 bundle + 静态页 + systemd + 配置 + Caddy，密码和 gateway key 只打印一次
bash scripts/bootstrap-server.sh orca-web <你的域名>

# 家里（repo 里运行一次；需要 Node 24）
powershell scripts\bootstrap-gateway.ps1   # 装到 %APPDATA%\orca-web，接管自启，打开管理页
```

家里唯一的"手工"步骤：在 `http://127.0.0.1:8790` 的本机管理页把 bootstrap-server 打印的
gatewayKey 贴进去，再粘贴桌面 Orca 生成的 `orca://pair?code=…` 配对码。

日常更新：

```bash
bash scripts/deploy-web.sh      # 前端改动后：tc + build + scp + 原子换 dist + 校验 hash
bash scripts/deploy-server.sh   # 改了 apps/server、apps/gateway、src/shared 后：tc + bundle + 重启服务 + health
```

两个脚本都走 ssh 别名 `orca-web`（定义在运维机的 `~/.ssh/config`，`ORCA_WEB_SSH` 环境变量可覆盖）。
`npm run tc`（server/gateway/scripts 的 strict typecheck + 前端 typecheck）与 CI
（`.github/workflows/ci.yml`）是同一道闸，部署脚本会再跑一遍，不要绕过。

要点：

- **服务端产物**：VPS 跑 `/opt/orca-web/dist-server/orca-server.cjs`（配置 `/etc/orca-web/server.json`，
  静态目录 `/opt/orca-web/apps/web/dist`）；部署前旧文件会留成 `dist.bak-*` / `src-backup-*.tgz`，
  回滚就是把备份 `mv` 回来。
- **验证**：`https://<域名>/api/health` 要 `"gateway":{"connected":true,…}`；
  `deploy-web.sh` 结尾会确认线上 assets 里有刚构建的 `index-*.css/js` 哈希，缺了即报错退出。
- **看日志**：VPS `journalctl -u orca-web.service -f`；前端是纯静态文件，无日志。

### 家里 gateway 的常驻（Windows，本机现状）

1. 一切都在 `%APPDATA%\orca-web\`：`orca-gateway.cjs`（bundle）、`gateway.json`（hub 地址、
   gatewayKey、Orca 配对材料——bearer 凭据，权限收紧）、`gateway-loop.cmd`、`gateway.log`。
2. `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\orca-web-gateway.vbs`：
   登录时无窗口拉起 loop（模板 `scripts\gateway-autostart.vbs`），进程退出 10 秒重启。
3. **用登录触发是刻意的**：gateway 必须和桌面 Orca 同用户，才读得到配对材料、连得上
   `127.0.0.1` 的 Orca 端点——服务/计划任务以其他身份跑反而拿不到凭据。
4. 升级/重装 gateway：重跑一遍 `powershell scripts\bootstrap-gateway.ps1`，它会停掉旧进程
   与旧自启循环、装新 bundle；**不会动** `gateway.json`。

排查顺序：`%APPDATA%\orca-web\gateway.log`（家里）→ `journalctl -u orca-web.service`（VPS）→
浏览器登录页的连接状态条。改 hub 地址、gatewayKey 或换配对码不用碰文件，开
`http://127.0.0.1:8790`（gateway 的本机管理页，端口 `ORCA_WEB_ADMIN_PORT` 可换）。
其余步骤见 [`docs/DEPLOY.md`](docs/DEPLOY.md)。

Gateway 同时开着一个**本机管理页**：`http://127.0.0.1:8790`（默认，`ORCA_WEB_ADMIN_PORT` 或
`admin.port` 可换）。在浏览器里就能做三件事：看 hub / Orca 连接状态、改 hub 地址和 gateway
key、粘贴桌面 Orca 生成的 `orca://pair?code=…` 配对码——不再需要手改配置文件。改动即时生效
（校验 → 写入配置文件 → 原地换连接，失败则进程退出交给启动循环恢复），所以换配对连手机都不
用碰。

信任边界没有被这个页面破坏：它只绑 `127.0.0.1`，别的机器进不来；配对码（等于 Orca 凭据）只在
同一台机器的浏览器和 gateway 之间走，**不经过 VPS**；POST 还要过同源检查（Origin +
`Sec-Fetch-Site` + 自定义头），别的网站在你的浏览器里也伪造不了请求。唯一的前提是 gateway 用
`--config` 启动——配置有落盘的地方，改动能持久。

---

## 状态与限制

已验证（对着真实 Orca 1.4.249 跑过）：

- E2EE v2 握手 + device token 鉴权；`status.get`、`project.list`、`worktree.ps`
- `agentSession.history`、`agentSession.subscribeStatus` 的 snapshot / status
- 完整写入周期：`create` → `send` → 观察到运行中的回合 → `cancel` → `close`
- mutation envelope 确实到达 Orca 的指纹校验（在产生副作用之前就被拒）
- 端到端：公网 HTTPS 登录 → 看板 → 任务详情 → 回复

尚未在真实会话里点过：

- 审批 / 提问的回传（`respondToApproval` / `respondToQuestion`）只按上游 schema 实现过，
  还没在真正卡住的确认上点一次。

已知上限：

- 待处理的审批/提问从 history 尾部 40 条里读，`currentRequests` 的版本化读取还没接。
- 实时刷新一次最多 200 条历史。
- 单用户、单 gateway、单 hub。
