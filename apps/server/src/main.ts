// VPS entry point: HTTP login + static app, WSS for browsers (/client) and the home gateway (/gateway).
import { createServer, type IncomingMessage } from 'node:http'
import { WebSocketServer } from 'ws'
import { loadServerConfig } from './config.ts'
import { createRequestHandler, isAuthenticated } from './http-app.ts'
import { Hub } from './hub.ts'
import { SessionStore } from './sessions.ts'

const args = parseArgs(process.argv.slice(2))
const config = loadServerConfig(args.config)
const sessions = new SessionStore(config.sessionTtlMs, config.sessionStorePath)
const hub = new Hub({ gatewayKey: config.gatewayKey, log })
const server = createServer(createRequestHandler({ config, sessions, hub, log }))
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

function parseArgs(argv: string[]): { config?: string } {
  const parsed: { config?: string } = {}
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--config') {
      parsed.config = argv[++index]
      if (!parsed.config) {
        throw new Error('--config needs a path')
      }
    }
  }
  return parsed
}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`)
}
