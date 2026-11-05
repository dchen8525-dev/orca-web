// HTTP surface: login/logout/session/health plus the built web app.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ServerConfig } from './config.ts'
import { verifyPassword } from './passwords.ts'
import {
  SESSION_COOKIE,
  clearedSessionCookie,
  readCookie,
  sessionCookie,
  type SessionStore
} from './sessions.ts'
import type { Hub } from './hub.ts'

const MAX_LOGIN_BODY_BYTES = 4 * 1024
const LOGIN_WINDOW_MS = 15 * 60_000
const LOGIN_MAX_FAILURES = 10

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

export type RequestHandlerOptions = {
  config: ServerConfig
  sessions: SessionStore
  hub: Hub
  log: (message: string) => void
}

export function createRequestHandler(options: RequestHandlerOptions): (
  request: IncomingMessage,
  response: ServerResponse
) => void {
  const { config, sessions, hub } = options
  const failures = new Map<string, { count: number; resetAt: number }>()
  const startedAt = Date.now()

  return (request, response) => {
    let url: URL
    try {
      url = new URL(request.url ?? '/', 'http://localhost')
    } catch {
      // `OPTIONS *` and other non-URI request targets throw here; answer and move on.
      response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('bad request\n')
      return
    }
    setSecurityHeaders(response)

    if (url.pathname === '/api/health') {
      return json(response, 200, {
        ok: true,
        uptimeMs: Date.now() - startedAt,
        gateway: hub.getGatewayState()
      })
    }

    if (url.pathname === '/api/session') {
      const token = readCookie(request.headers.cookie, SESSION_COOKIE)
      const session = token ? sessions.touch(token) : null
      return json(response, 200, {
        authenticated: session !== null,
        ...(session ? { expiresAt: session.expiresAt } : {})
      })
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
      const ip = clientIp(request, config.trustProxy)
      const now = Date.now()
      const entry = failures.get(ip)
      if (entry && entry.resetAt > now && entry.count >= LOGIN_MAX_FAILURES) {
        return json(response, 429, { ok: false, error: 'too_many_attempts' })
      }
      return readJsonBody(request, (body) => {
        const password = typeof body.password === 'string' ? body.password : ''
        if (!password || !verifyPassword(password, config.passwordHash)) {
          recordFailure(failures, ip, now)
          return json(response, 401, { ok: false, error: 'invalid_credentials' })
        }
        failures.delete(ip)
        const { token } = sessions.create()
        response.setHeader(
          'Set-Cookie',
          sessionCookie(token, { secure: config.cookieSecure, ttlMs: config.sessionTtlMs })
        )
        return json(response, 200, { ok: true })
      })
    }

    if (url.pathname === '/api/logout' && request.method === 'POST') {
      const token = readCookie(request.headers.cookie, SESSION_COOKIE)
      if (token) {
        sessions.destroy(token)
      }
      response.setHeader('Set-Cookie', clearedSessionCookie({ secure: config.cookieSecure }))
      return json(response, 200, { ok: true })
    }

    if (url.pathname.startsWith('/api/')) {
      return json(response, 404, { ok: false, error: 'not_found' })
    }

    return serveStatic(config.staticDir, url.pathname, response)
  }
}

export function isAuthenticated(request: IncomingMessage, sessions: SessionStore): boolean {
  const token = readCookie(request.headers.cookie, SESSION_COOKIE)
  return token ? sessions.touch(token) !== null : false
}

function serveStatic(staticDir: string | undefined, pathname: string, response: ServerResponse): void {
  if (!staticDir) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('orca-web server is running; no web build configured\n')
    return
  }
  const root = resolve(staticDir)
  // A malformed % escape throws; failing to reject one anonymous request must never
  // take the process down.
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('bad request\n')
    return
  }
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const requested = resolve(join(root, relative))
  // startsWith alone would admit a sibling root like /app2 when this root is /app.
  const inside = requested === root || requested.startsWith(root + sep)
  const target =
    inside && existsSync(requested) && statSync(requested).isFile()
      ? requested
      : join(root, 'index.html')

  if (!existsSync(target)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found\n')
    return
  }
  const type = CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream'
  // index.html references content-hashed assets that each deploy replaces: a cached
  // index would point at deleted files and break the app until a hard refresh.
  response.writeHead(200, {
    'content-type': type,
    'cache-control':
      extname(target).toLowerCase() === '.html' ? 'no-store' : 'public, max-age=31536000, immutable'
  })
  createReadStream(target)
    .on('error', () => response.destroy())
    .pipe(response)
}

function readJsonBody(
  request: IncomingMessage,
  onBody: (body: Record<string, unknown>) => void
): void {
  let size = 0
  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => {
    size += chunk.length
    if (size > MAX_LOGIN_BODY_BYTES) {
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', () => {
    try {
      const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
      onBody(typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {})
    } catch {
      onBody({})
    }
  })
}

function recordFailure(
  failures: Map<string, { count: number; resetAt: number }>,
  ip: string,
  now: number
): void {
  const entry = failures.get(ip)
  if (!entry || entry.resetAt <= now) {
    failures.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  } else {
    entry.count++
  }
  // A spraying attacker rotating spoofed XFF values grows the map without bound;
  // expired rows are never read again, so drop them once the table is large.
  if (failures.size > 512) {
    for (const [key, record] of failures) {
      if (record.resetAt <= now) {
        failures.delete(key)
      }
    }
  }
}

function clientIp(request: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = request.headers['x-forwarded-for']
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
    // The closest trusted proxy appends the real client last; earlier entries are
    // attacker-controlled and would let a spoofer rotate past the failure limit.
    const hops = value?.split(',').map((hop) => hop.trim()).filter(Boolean)
    const last = hops?.[hops.length - 1]
    if (last) {
      return last
    }
  }
  return request.socket.remoteAddress ?? 'unknown'
}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('referrer-policy', 'no-referrer')
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  })
  response.end(JSON.stringify(body))
}
