// VPS entry point: HTTP login + static app, WSS for browsers (/client) and the home gateway (/gateway).
import { createServer, type IncomingMessage } from 'node:http'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'
import { WebSocketServer } from 'ws'
import { DEFAULT_CONFIG_PATH, loadServerConfig } from './config.ts'
import { createRequestHandler, isAuthenticated } from './http-app.ts'
import { hashPassword } from './passwords.ts'
import { Hub } from './hub.ts'
import { SessionStore } from './sessions.ts'

const args = parseArgs(process.argv.slice(2))
if (args.initConfig) {
  initConfig(args.initConfig, args.publicOrigin)
  process.exit(0)
}
const config = loadServerConfig(args.config)
const configPath = args.config ?? process.env.ORCA_WEB_SERVER_CONFIG ?? DEFAULT_CONFIG_PATH
const sessions = new SessionStore(config.sessionTtlMs, config.sessionStorePath)
const hub = new Hub({ gatewayKey: config.gatewayKey, log })
const server = createServer(
  createRequestHandler({
    config,
    sessions,
    hub,
    log,
    // The file owner persists the rotated hash; one with no --config (dev) still
    // verifies the current password but answers 501 instead.
    applyPasswordHash: (encoded) => persistPasswordHash(configPath, encoded)
  })
)
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request: IncomingMessage, socket, head) => {
  const url = new URL(request.url ?? '/', 'http://localhost')

  if (url.pathname === '/gateway') {
    wss.handleUpgrade(request, socket, head, (ws) => hub.attachGateway(ws))
    return
  }

  if (url.pathname === '/client') {
    if (!originAllowed(request, config.publicOrigin)) {
      log(`client upgrade rejected: origin ${request.headers.origin ?? '(none)'}`)
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }
    if (!isAuthenticated(request, sessions)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }
    wss.handleUpgrade(request, socket, head, (ws) => hub.attachClient(ws))
    return
  }

  socket.destroy()
})

server.listen(config.port, config.host, () => {
  log(`orca-web server listening on http://${config.host}:${config.port}`)
  log(`public origin ${config.publicOrigin ?? '(unset: origin check disabled, development only)'}`)
  log(`secure cookie ${config.cookieSecure}`)
})

let shuttingDown = false
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    log(`${signal}: shutting down`)
    hub.closeAll()
    wss.close()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3_000).unref()
  })
}

function originAllowed(request: IncomingMessage, publicOrigin: string | undefined): boolean {
  if (!publicOrigin) {
    return true
  }
  return request.headers.origin === publicOrigin
}

function parseArgs(argv: string[]): { config?: string; initConfig?: string; publicOrigin?: string } {
  const parsed: { config?: string; initConfig?: string; publicOrigin?: string } = {}
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--config') {
      parsed.config = argv[++index]
    } else if (argv[index] === '--init-config') {
      parsed.initConfig = argv[++index]
    } else if (argv[index] === '--public-origin') {
      parsed.publicOrigin = argv[++index]
    }
  }
  if ((parsed.config ?? parsed.initConfig) === undefined) {
    throw new Error('--config 或 --init-config 必须二选一')
  }
  for (const [flag, value] of Object.entries(parsed)) {
    if (value === undefined) {
      throw new Error(`${flag} 需要一个参数`)
    }
  }
  return parsed
}

// bootstrap/deb 专用：生成 server.json（永不覆盖已有配置），密码只在这里显示一次。
// bootstrap/deb 专用：生成 server.json（永不覆盖已有配置），密码只在这里显示一次。
function initConfig(outPath: string, publicOrigin?: string): void {
  if (existsSync(outPath)) {
    throw new Error(`配置已存在，拒绝覆盖: ${outPath}`)
  }
  const password = randomBytes(6).toString('hex')
  const cfg: Record<string, unknown> = {
    host: '127.0.0.1',
    port: 8788,
    gatewayKey: randomBytes(24).toString('base64'),
    passwordHash: hashPassword(password),
    staticDir: 'apps/web/dist',
    sessionStorePath: '/var/lib/orca-web/sessions.json'
  }
  if (publicOrigin) {
    cfg.publicOrigin = publicOrigin
    cfg.cookieSecure = publicOrigin.startsWith('https://')
    cfg.trustProxy = true
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 })
  console.log(`配置已生成: ${outPath}`)
  console.log(`登录密码（只显示这一次，请立即保存）: ${password}`)
  if (publicOrigin) {
    console.log(`https:// 配置已写入 publicOrigin: ${publicOrigin}`)
  }
}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`)
}

function persistPasswordHash(configPath: string, encodedHash: string): void {
  const file = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>
  writeJson(configPath, { ...file, passwordHash: encodedHash })
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 })
  renameSync(temp, path)
}
