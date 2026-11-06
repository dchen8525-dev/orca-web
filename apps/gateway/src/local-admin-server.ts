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
  hubConnected: boolean
  orcaState: string
  orcaDescriptor: Record<string, unknown>
  configNote: string | null
}

export type LocalAdminOptions = {
  port: number
  status: () => AdminStatus
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

  <section class="card">
    <div class="row"><span class="label">hub</span><span id="hub-dot" class="dot"></span><span id="hub-value" class="value muted">读状态中…</span></div>
    <div class="row"><span class="label">hub 地址</span><span id="hub-url" class="value mono">—</span></div>
    <div class="row"><span class="label">orca</span><span id="orca-dot" class="dot"></span><span id="orca-value" class="value muted">读状态中…</span></div>
    <div class="row"><span class="label">配对状态</span><span id="pair-state" class="value muted">读状态中…</span></div>
    <div class="row"><span class="label">网关 id</span><span id="gateway-id" class="value muted"></span></div>
    <div class="row"><span class="label">配置文件</span><span id="config-path" class="value muted"></span></div>
    <div class="row" id="note-row" hidden><span class="label">提示</span><span id="config-note" class="value" style="color:#b07d24"></span></div>
  </section>

  <section class="card">
    <p class="field-label">hub 地址与 gateway key</p>
    <p class="card-state" id="hub-state">当前连接状态会出现在这里。</p>
    <input id="server-url" placeholder="wss://你的服务器/gateway（要换服务器才填）" autocomplete="off" />
    <input id="gateway-key" type="password" placeholder="gateway key（已保存过，留空表示不改）" autocomplete="new-password" />
    <button id="save-hub">保存并重连</button>
    <p id="hub-note" class="note"></p>
  </section>

  <section class="card">
    <p class="field-label">桌面 Orca 配对码</p>
    <p class="card-state" id="pair-card-state">配对状态会出现在这里。</p>
    <textarea id="pairing-code" placeholder="orca://pair?code=……（桌面 Orca 设置里生成，直接整段粘贴）"></textarea>
    <button id="apply-pairing">重新配对（替换现有配对）</button>
    <p id="pair-note" class="note"></p>
  </section>

  <p class="hint">
    <b>改完 hub 地址 / key：</b>网关立刻断开旧连接、用新配置拨号，状态几秒内刷新。<br />
    <b>换配对：</b>在桌面 Orca 的 设置 → 手机配对 生成码，粘贴到这里即可；重新配对会替换现有配对，旧的设备可在桌面 Orca 里撤销。<br />
    <b>本页只绑 127.0.0.1：</b>别的机器连不进来；配对信息也不经过 VPS。
  </p>
</main>
<script>
  function setText(id, text) { document.getElementById(id).textContent = text; }
  function setDot(id, state) { document.getElementById(id).className = 'dot ' + state; }
  function render(status) {
    var hub = status.hubConnected;
    var orca = status.orcaState;
    var desc = status.orcaDescriptor || {};
    var orcaLive = orca === 'connected';
    var hubText = hub ? '已连接' : '重试中…';

    // verdict: "do I need to touch anything?" at a glance
    var verdictDot = document.getElementById('verdict-dot');
    var verdict = document.getElementById('verdict');
    if (hub && orcaLive) {
      setDot('verdict-dot', 'on');
      verdict.textContent = '一切正常：hub 已连通、Orca 已配对在用。不需要动下面的任何设置。';
      verdict.style.color = 'var(--green)';
    } else if (hub && !orcaLive) {
      setDot('verdict-dot', 'warn');
      verdict.textContent = 'hub 正常，但 Orca 没连上：先确认桌面 Orca 开着；不行再重新配对（用下一张卡）。';
      verdict.style.color = '#b07d24';
    } else if (!hub && orcaLive) {
      setDot('verdict-dot', 'warn');
      verdict.textContent = '和 Orca 是通的，但 hub 连不上：检查 hub 地址 / key（下一张卡），或 VPS 是否停机。';
      verdict.style.color = '#b07d24';
    } else {
      setDot('verdict-dot', 'off');
      verdict.textContent = 'hub 和 Orca 都没连上。刚装机属正常：先填 hub 地址与 key，再粘贴配对码。';
      verdict.style.color = 'var(--red)';
    }

    setDot('hub-dot', hub ? 'on' : 'off');
    setText('hub-value', hubText);
    setText('hub-url', status.hubUrl || '—');
    setText('hub-state', hub
      ? ('现在和 ' + (status.hubUrl || '—') + ' 是通的。这组字段不动它就没事；只有换服务器时才需要填。')
      : '现在没连上（已在后台自动重拨）。把它连上需要 hub 地址和 gatewayKey，两样都必须填。');

    setDot('orca-dot', orcaLive ? 'on' : orca === 'disconnected' ? 'off' : 'warn');
    var orcaText = orca;
    if (desc.appVersion) orcaText += ' · Orca ' + desc.appVersion;
    if (desc.machineName) orcaText += ' · ' + desc.machineName;
    setText('orca-value', orcaText);

    var orcaNamed = desc.appVersion || desc.machineName;
    var pairValue = orcaLive
      ? ('已配对并在用' + (orcaNamed ? '（' + orcaNamed + '）' : ''))
      : orca === 'disconnected' && orcaNamed
        ? '已配对，但此刻不在线'
        : (status.pairedVia === 'local-orca' ? '已本地配对' : '读状态中…');
    setText('pair-state', pairValue);
    setText('pair-card-state', orcaLive
      ? '已和桌面 Orca 配对且正常使用中。粘贴新配对码会替换现有配对——旧设备可在桌面 Orca 里撤销，正常情况不需要操作。'
      : '还没和 Orca 走起来。到桌面 Orca 的 设置 → 手机配对 生成一条配对码，整段粘贴到框里即可。');

    setText('gateway-id', status.gatewayId);
    setText('config-path', status.configPath || '（未用 --config，配置无处落盘）');
    var noteRow = document.getElementById('note-row');
    if (status.configNote) { noteRow.hidden = false; setText('config-note', status.configNote); }
    else { noteRow.hidden = true; }
  }
  function refresh() {
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (payload) { render(payload.status); }).catch(function () {
      var hubDot = document.getElementById('hub-dot'); hubDot.className = 'dot off';
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
      refresh();
    });
  });
  refresh();
  setInterval(refresh, 3000);
</script>
</body>
</html>
`
