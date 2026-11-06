// Loopback-only admin page: re-pair the gateway and edit its hub config from a browser,
// so nothing about pairing has to go through chat or files by hand. The token leaves the
// machine never: it travels from this same host's browser to this same host's server.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { ConfigError, decodePairingCode, loopbackEndpoint, normalizeHubUrl, type ConfigUpdates } from './config.ts'

export type AdminStatus = {
  gatewayId: string
  configPath: string | null
  pairedVia: string
  hubUrl: string
  /** The gateway must hold its hub credential in memory anyway; the page is loopback-only. */
  hubKey: string
  hubConnected: boolean
  orcaState: string
  orcaDescriptor: Record<string, unknown>
  configNote: string | null
}

export type LocalAdminOptions = {
  port: number
  status: () => AdminStatus
  /** Config file as on disk (fresh per read, never cached by the page render). */
  readFile: () => string | null
  apply: (updates: ConfigUpdates) => Promise<string>
}

const BODY_LIMIT = 64 * 1024

export class LocalAdminServer {
  private server: ReturnType<typeof createServer> | null = null
  private readonly options: LocalAdminOptions

  constructor(options: LocalAdminOptions) {
    this.options = options
  }

  start(): void {
    if (this.server) {
      return
    }
    this.server = createServer((request, response) => {
      void this.handle(request, response).catch(() => {
        tryJson(response, 500, { ok: false, error: 'internal error' })
      })
    })
    // Loopback only: the page must never be reachable from another machine.
    this.server.listen(this.options.port, '127.0.0.1', () => {
      console.log(`${new Date().toISOString()} admin page at http://127.0.0.1:${this.options.port}`)
    })
    // A silent EADDRINUSE crash-loop is undiagnosable; say why, then let the
    // account's restart loop bring the gateway back cleanly.
    this.server.on('error', (error) => {
      console.error(`${new Date().toISOString()} admin server error: ${(error as Error).message}`)
      setTimeout(() => process.exit(3), 500).unref()
    })
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = (request.url ?? '/').split('?')[0]
    if (request.method === 'GET' && (path === '/' || path === '/index.html')) {
      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      })
      response.end(ADMIN_PAGE_HTML)
      return
    }
    if (request.method === 'GET' && path === '/api/status') {
      tryJson(response, 200, { ok: true, status: this.options.status() })
      return
    }
    if (request.method === 'GET' && path === '/api/file') {
      tryJson(response, 200, {
        ok: true,
        configPath: this.options.status().configPath,
        raw: this.options.readFile()
      })
      return
    }
    if (request.method === 'POST' && path === '/api/config') {
      await this.handleConfig(request, response)
      return
    }
    tryJson(response, 404, { ok: false, error: 'not found' })
  }

  private async handleConfig(request: IncomingMessage, response: ServerResponse): Promise<void> {
    // Same-origin enforcement: a web page elsewhere must not be able to rewrite this config.
    const origin = request.headers.origin
    const sameOrigin =
      origin === undefined || origin === `http://127.0.0.1:${this.options.port}`
    const fetchSite = request.headers['sec-fetch-site']
    const isCrossSiteForm = fetchSite !== undefined && fetchSite !== 'same-origin' && fetchSite !== 'none'
    if (!sameOrigin || isCrossSiteForm || request.headers['x-orca-web-admin'] !== '1') {
      tryJson(response, 403, { ok: false, error: '跨站配置请求被拒绝' })
      return
    }

    const body = await readBody(request)
    let input: { serverUrl?: unknown; gatewayKey?: unknown; pairingCode?: unknown }
    try {
      input = JSON.parse(body) as typeof input
    } catch {
      tryJson(response, 400, { ok: false, error: 'body 不是合法 JSON' })
      return
    }

    const updates: ConfigUpdates = {}
    try {
      const serverUrl = asText(input.serverUrl)
      if (serverUrl) {
        updates.serverUrl = normalizeHubUrl(serverUrl.value)
      }
      const gatewayKey = asText(input.gatewayKey)
      if (gatewayKey?.value) {
        updates.gatewayKey = gatewayKey.value
      }
      const pairingCode = asText(input.pairingCode)
      if (pairingCode?.value) {
        const offer = decodePairingCode(pairingCode.value)
        updates.orca = {
          endpoint: loopbackEndpoint(offer.endpoint),
          deviceToken: offer.deviceToken,
          hostPublicKeyB64: offer.publicKeyB64
        }
      }
    } catch (error) {
      const status = error instanceof ConfigError ? 400 : 500
      tryJson(response, status, { ok: false, error: (error as Error).message })
      return
    }
    if (!updates.serverUrl && !updates.gatewayKey && !updates.orca) {
      tryJson(response, 400, { ok: false, error: '没有填写任何要修改的内容' })
      return
    }

    try {
      const message = await this.options.apply(updates)
      tryJson(response, 200, { ok: true, message })
    } catch (error) {
      tryJson(response, 500, { ok: false, error: (error as Error).message })
    }
  }
}

function asText(value: unknown): { value: string } | null {
  return typeof value === 'string' ? { value } : null
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > BODY_LIMIT) {
        reject(new Error('body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function tryJson(response: ServerResponse, status: number, payload: unknown): void {
  if (response.headersSent) {
    return
  }
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

const ADMIN_PAGE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orca 网关管理</title>
<style>
  :root {
    --paper: #faf7f1; --ink: #1c1a17; --muted: #857c6e; --faint: #a89e8e;
    --rule: #e2dacd; --rule-strong: #cfc5b4; --green: #3f6b52; --red: #8f2f22; --accent: #a8492a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font: 15px/1.6 -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif; }
  main { max-width: 660px; margin: 0 auto; padding: 40px 22px 60px; }
  .kicker { font: 500 10px/1 sans-serif; letter-spacing: 0.24em; text-transform: uppercase; color: var(--faint); }
  h1 { margin: 8px 0 6px; font: 400 30px/1.2 Georgia, 'Songti SC', serif; }
  .dek { margin: 0 0 26px; color: var(--muted); font-size: 13.5px; }
  .card { border: 1px solid var(--rule-strong); background: #fffdf9; padding: 16px 18px; margin-bottom: 18px; }
  .card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .card-sub { text-transform: none; letter-spacing: 0.04em; color: var(--muted); font-weight: 400; }
  .chip { flex: none; font: 500 10px/1 sans-serif; letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 9px; border: 1px solid var(--rule-strong); color: var(--muted); }
  .chip-on { color: var(--green); border-color: rgba(63, 107, 82, 0.4); background: rgba(63, 107, 82, 0.06); }
  .chip-off { color: var(--red); border-color: rgba(143, 47, 34, 0.35); background: rgba(143, 47, 34, 0.05); }
  .chip-warn { color: #b07d24; border-color: rgba(176, 125, 36, 0.45); background: rgba(176, 125, 36, 0.08); }
  .ghost-inline { background: none; color: var(--muted); border: 1px solid var(--rule); padding: 4px 9px; font: 500 10.5px/1.4 sans-serif; letter-spacing: 0.06em; cursor: pointer; text-transform: none; }
  .ghost-inline:hover { color: var(--ink); border-color: var(--rule-strong); }
  .form-note { margin: 2px 0 10px; font-size: 12.5px; color: var(--muted); line-height: 1.6; }
  .form-note b { color: var(--red); font-weight: 500; }
  .form-actions { display: flex; align-items: center; gap: 10px; }
  .file-view { margin: 8px 0 0 101px; max-width: 520px; max-height: 300px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--rule); border-left: 2px solid var(--rule-strong); padding: 9px 12px; font: 11.5px/1.65 ui-monospace, Menlo, Consolas, monospace; color: #4a453d; background: rgba(28, 26, 23, 0.03); }
  .mono { font: 12px/1.6 ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
  .card-state { margin: -2px 0 12px; font-size: 12.5px; color: var(--muted); line-height: 1.6; }
  .row { display: flex; align-items: baseline; gap: 9px; padding: 5px 0; font-size: 13.5px; flex-wrap: wrap; }
  .row .label { flex: none; width: 92px; color: var(--muted); }
  .row .value { min-width: 0; overflow-wrap: anywhere; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--faint); position: relative; top: -1px; }
  .dot.on { background: var(--green); }
  .dot.off { background: var(--red); }
  .dot.warn { background: #b07d24; }
  .field-label { margin: 0 0 6px; font: 500 10px/1 sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
  input, textarea { width: 100%; border: 0; border-bottom: 1px solid var(--rule-strong); background: none; padding: 8px 0; margin-bottom: 14px; outline: none; font: inherit; }
  input:focus, textarea:focus { border-bottom-color: var(--ink); }
  textarea { font: 12.5px/1.6 ui-monospace, Menlo, Consolas, monospace; resize: vertical; min-height: 84px; }
  button { background: var(--ink); color: var(--paper); border: 0; padding: 10px 18px; font: 500 11px/1 sans-serif; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
  button:disabled { opacity: 0.45; cursor: default; }
  .note { margin: 4px 0 0; font-size: 13px; color: var(--green); min-height: 1.4em; }
  .note.bad { color: var(--red); }
  .hint { margin: 26px 0 0; font-size: 12.5px; color: var(--faint); line-height: 1.75; }
  .hint b { color: var(--muted); font-weight: 500; }
</style>
</head>
<body>
<main>
  <div class="kicker">orca-web · local admin</div>
  <h1>网关管理</h1>
  <p class="dek">这台电脑上的 gateway 如何连 hub、如何连桌面 Orca —— 都在这一页改，不需要再动文件。</p>

  <section class="card" id="verdict-card">
    <div class="row"><span id="verdict-dot" class="dot"></span><span id="verdict" class="value" style="font-weight:500">读状态中…</span></div>
  </section>

  <section class="card" id="card-hub">
    <div class="card-head">
      <p class="field-label" style="margin:0">hub 连接 <span class="card-sub">gateway ↔ 远端服务器</span></p>
      <span class="chip" id="hub-chip">读状态中…</span>
    </div>
    <div class="row"><span class="label">状态</span><span id="hub-dot" class="dot"></span><span id="hub-value" class="value muted">读状态中…</span></div>
    <div class="row"><span class="label">服务器</span><span class="dot" style="visibility:hidden"></span><span id="hub-url" class="value mono">—</span></div>
    <div id="hub-form" hidden>
      <p class="form-note">换服务器或换 key。地址 + key 两样都填才会全部替换；只填一个就只改一个。保存后立刻重拨。</p>
      <input id="server-url" placeholder="wss://服务器域名/gateway" autocomplete="off" />
      <input id="gateway-key" type="password" placeholder="gateway key（新 key）" autocomplete="new-password" />
      <div class="form-actions"><button id="save-hub">保存并重连</button><button id="hub-cancel" class="ghost-inline" type="button">取消</button></div>
      <p id="hub-note" class="note"></p>
    </div>
    <button id="hub-edit" class="ghost-inline" type="button">修改地址 / key…</button>
  </section>

  <section class="card" id="card-orca">
    <div class="card-head">
      <p class="field-label" style="margin:0">桌面 Orca 配对 <span class="card-sub">gateway ↔ 这台电脑的 Orca</span></p>
      <span class="chip" id="orca-chip">读状态中…</span>
    </div>
    <div class="row"><span class="label">配对状态</span><span id="pair-dot" class="dot" style="visibility:hidden"></span><span id="pair-state" class="value muted">读状态中…</span></div>
    <div class="row"><span class="label">Orca 连接</span><span class="dot" style="visibility:hidden"></span><span id="orca-value" class="value muted">读状态中…</span></div>
    <div id="pair-form" hidden>
      <p class="form-note">粘贴新配对码 = <b>替换现有配对</b>。旧设备可在桌面 Orca 的设置里撤销；正常在用就不需要重新配对。</p>
      <textarea id="pairing-code" placeholder="orca://pair?code=……（桌面 Orca 设置 → 手机配对 生成，整段粘贴）"></textarea>
      <div class="form-actions"><button id="apply-pairing">完成配对</button><button id="pair-cancel" class="ghost-inline" type="button">取消</button></div>
      <p id="pair-note" class="note"></p>
    </div>
    <button id="pair-edit" class="ghost-inline" type="button">重新配对…</button>
  </section>

  <section class="card">
    <div class="row"><span class="label">网关 id</span><span class="dot" style="visibility:hidden"></span><span id="gateway-id" class="value muted"></span></div>
    <div class="row"><span class="label">配置文件</span><span class="dot" style="visibility:hidden"></span><span id="config-path" class="value muted"></span><button id="file-eye" class="ghost-inline" type="button">👁 查看配置</button></div>
    <pre id="file-view" class="file-view" hidden></pre>
    <div class="row" id="note-row" hidden><span class="label">注意</span><span class="dot" style="visibility:hidden"></span><span id="config-note" class="value" style="color:#b07d24"></span></div>
  </section>

  <p class="hint">
    <b>状态自动刷新</b>：每 3 秒重读一次，改完几秒内就能看到新状态。<br />
    <b>本页只绑 127.0.0.1：</b>别的机器连不进来；key 和配对信息不离开这台电脑、不经过 VPS。
  </p>
</main>
<script>
  function setText(id, text) { document.getElementById(id).textContent = text; }
  function setDot(id, state) {
    var el = document.getElementById(id);
    el.className = 'dot ' + state;
    // Reserved placeholder dots hide with an inline style; a real state must always show.
    el.style.visibility = 'visible';
  }
  function setChip(id, text, state) {
    var el = document.getElementById(id);
    el.textContent = text;
    el.className = 'chip ' + state;
  }
  function render(status) {
    var hub = status.hubConnected;
    var orca = status.orcaState;
    var desc = status.orcaDescriptor || {};
    var orcaLive = orca === 'connected';

    // verdict: "do I need to touch anything?" at a glance
    var verdictDot = document.getElementById('verdict-dot');
    var verdict = document.getElementById('verdict');
    if (hub && orcaLive) {
      setDot('verdict-dot', 'on');
      verdict.textContent = '一切正常：hub 连通，Orca 配对在用。以下设置无需改动。';
      verdict.style.color = 'var(--green)';
    } else if (hub && !orcaLive) {
      setDot('verdict-dot', 'warn');
      verdict.textContent = 'hub 已连通；桌面 Orca 未连接。先确认 Orca 在运行，仍无果再重新配对。';
      verdict.style.color = '#b07d24';
    } else if (!hub && orcaLive) {
      setDot('verdict-dot', 'warn');
      verdict.textContent = '桌面 Orca 在线；hub 未连通。先检查 VPS 是否在运行，换 hub 时用下方的修改入口。';
      verdict.style.color = '#b07d24';
    } else {
      setDot('verdict-dot', 'off');
      verdict.textContent = '两组连接均未建立。初次安装属此情形：先填写 hub 地址与 key，再完成配对。';
      verdict.style.color = 'var(--red)';
    }

    // group: gateway ↔ hub
    setChip('hub-chip', hub ? '已连接' : '重试中…', hub ? 'chip-on' : 'chip-off');
    setDot('hub-dot', hub ? 'on' : 'off');
    setText('hub-value', hub ? '正常，和服务器保持在线' : '在后台自动重拨，隔几秒自动变');
    setText('hub-url', status.hubUrl || '—');

    // group: gateway ↔ orca
    var version = desc.appVersion ? 'Orca ' + desc.appVersion : null;
    var machine = desc.machineName || null;
    var orcaIdent = [version, machine].filter(Boolean).join(' · ');
    if (orcaLive) {
      setChip('orca-chip', '在线', 'chip-on');
      setDot('pair-dot', 'on');
      setText('pair-state', machine ? '已配对，正在和 ' + machine + ' 上的 Orca 通信' : '已配对，正在通信');
    } else if (orcaIdent) {
      setChip('orca-chip', '离线', 'chip-warn');
      setDot('pair-dot', 'warn');
      setText('pair-state', '已配对，但 Orca 现在没连上——桌面 Orca 开机/打开了吗？');
    } else if (status.pairedVia === 'local-orca') {
      setChip('orca-chip', '等待', 'chip-warn');
      setDot('pair-dot', 'warn');
      setText('pair-state', '本轮用桌面 Orca 的本地配对材料读取，还未走通连接');
    } else {
      setChip('orca-chip', '未配对', 'chip-off');
      setDot('pair-dot', 'off');
      setText('pair-state', '还没有配对材料');
    }
    setText('orca-value', orcaIdent || '还没有读到 Orca 的信息');
    setText('orca-value', orcaIdent || '还没有读到 Orca 的信息');

    setText('gateway-id', status.gatewayId);
    setText('config-path', status.configPath || '（未用 --config，配置无处落盘）');
    var noteRow = document.getElementById('note-row');
    if (status.configNote) { noteRow.hidden = false; setText('config-note', status.configNote); }
    else { noteRow.hidden = true; }
  }
  function refresh() {
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (payload) {
      try {
        render(payload.status);
      } catch (error) {
        setDot('verdict-dot', 'off');
        var verdict = document.getElementById('verdict');
        verdict.textContent = '状态渲染出错（页面结构与服务版本不一致？）刷新本页试试。';
        verdict.style.color = 'var(--red)';
        console.error('admin render error', error);
      }
    }).catch(function () {
      setChip('hub-chip', '无响应', 'chip-off');
      setDot('hub-dot', 'off');
      setText('hub-value', '管理服务无响应');
    });
  }
  function postConfig(payload, noteEl, button, done) {
    noteEl.textContent = '提交中…'; noteEl.className = 'note'; button.disabled = true;
    fetch('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-orca-web-admin': '1' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (p) { return { httpStatus: r.status, payload: p }; }); }).then(function (r) {
      button.disabled = false;
      noteEl.className = 'note' + (r.payload.ok ? '' : ' bad');
      noteEl.textContent = r.payload.ok ? (r.payload.message || '已应用。') : (r.payload.error || '失败');
      if (r.payload.ok) { setTimeout(done, 1200); }
    }).catch(function (error) {
      button.disabled = false;
      noteEl.className = 'note bad';
      noteEl.textContent = String(error);
    });
  }
  document.getElementById('file-eye').addEventListener('click', function () {
    var view = document.getElementById('file-view');
    if (view.hidden) {
      view.textContent = '读配置文件…';
      view.hidden = false;
      this.textContent = '🙈 收起配置';
      fetch('/api/file').then(function (r) { return r.json(); }).then(function (payload) {
        if (!payload.ok) { view.textContent = '读失败了：' + (payload.error || 'unknown'); return; }
        view.textContent = payload.raw
          ? '// ' + (payload.configPath || '(config)') + '\\n' + payload.raw
          : '配置文件不存在（未用 --config 启动，配置只存内存）';
      }).catch(function (error) {
        view.textContent = '读失败了：' + String(error);
      });
    } else {
      view.hidden = true;
      this.textContent = '👁 查看配置';
    }
  });
  function toggleForm(showId, editBtnId) {
    document.getElementById(showId).hidden = !document.getElementById(showId).hidden;
    document.getElementById(editBtnId).hidden = !document.getElementById(showId).hidden;
  }
  document.getElementById('hub-edit').addEventListener('click', function () { toggleForm('hub-form', 'hub-edit'); });
  document.getElementById('hub-cancel').addEventListener('click', function () { document.getElementById('hub-form').hidden = true; document.getElementById('hub-edit').hidden = false; });
  document.getElementById('pair-edit').addEventListener('click', function () { toggleForm('pair-form', 'pair-edit'); });
  document.getElementById('pair-cancel').addEventListener('click', function () { document.getElementById('pair-form').hidden = true; document.getElementById('pair-edit').hidden = false; });
  document.getElementById('save-hub').addEventListener('click', function () {
    var payload = {};
    var url = document.getElementById('server-url').value.trim();
    var key = document.getElementById('gateway-key').value;
    if (url) payload.serverUrl = url;
    if (key) payload.gatewayKey = key;
    if (!payload.serverUrl && !payload.gatewayKey) {
      var n = document.getElementById('hub-note'); n.className = 'note bad'; n.textContent = '两个都没填。';
      return;
    }
    postConfig(payload, document.getElementById('hub-note'), this, function () {
      document.getElementById('gateway-key').value = '';
      document.getElementById('hub-form').hidden = true;
      document.getElementById('hub-edit').hidden = false;
      refresh();
    });
  });
  document.getElementById('apply-pairing').addEventListener('click', function () {
    var code = document.getElementById('pairing-code').value;
    if (!code.trim()) {
      var n = document.getElementById('pair-note'); n.className = 'note bad'; n.textContent = '配对码为空。';
      return;
    }
    postConfig({ pairingCode: code }, document.getElementById('pair-note'), this, function () {
      document.getElementById('pairing-code').value = '';
      document.getElementById('pair-form').hidden = true;
      document.getElementById('pair-edit').hidden = false;
      refresh();
    });
  });
  refresh();
  setInterval(refresh, 3000);
</script>
</body>
</html>
`
