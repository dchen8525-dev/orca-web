// End-to-end check of the VPS server: login, cookie, /client WebSocket, gateway round trip.
import WebSocket from 'ws'
import type { HubToWeb } from '../src/shared/web-protocol.ts'

const base = process.env.DEV_SERVER_URL ?? 'http://127.0.0.1:8788'
const wsBase = base.replace(/^http/, 'ws')
const origin = base
const password = process.env.DEV_PASSWORD ?? 'test-password'
const results: { name: string; ok: boolean; detail?: string }[] = []

async function main(): Promise<void> {
const health = await getJson('/api/health')
record('health', health.response.status === 200, JSON.stringify(health.body))

const wrong = await postJson('/api/login', { password: 'nope' })
record('login rejects a wrong password', wrong.response.status === 401)

const anonymousSocket = await expectUpgradeRejected(`${wsBase}/client`)
record('client socket requires a session', anonymousSocket === 401, `status ${anonymousSocket}`)

const login = await postJson('/api/login', { password })
const cookie = login.response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
record('login sets a session cookie', login.response.status === 200 && cookie.length > 0)

const session = await getJson('/api/session', cookie)
record('session is authenticated', (session.body as { authenticated?: boolean }).authenticated === true)

const socket = new WebSocket(`${wsBase}/client`, { origin, headers: { Cookie: cookie } })
const client = new TestClient(socket)
await client.opened

const welcome = await client.next('welcome')
const welcomeFrame = welcome as { gatewayConnected?: boolean }
record('welcome reports the gateway', welcomeFrame.gatewayConnected === true, JSON.stringify(welcome))

const status = (await client.request('status.get')) as Record<string, unknown>
record('status.get through the hub', status.appVersion !== undefined, `app=${String(status.appVersion)}`)

const worktrees = (await client.request('worktree.ps', {})) as { worktrees?: unknown[] }
record(
  'worktree.ps through the hub',
  Array.isArray(worktrees.worktrees),
  `${worktrees.worktrees?.length ?? 0} rows`
)

const snapshot = (await client.collectNonEmpty('agentSession.subscribeStatus', {}, 12_000)) as {
  sessions?: unknown[]
}
record(
  'status feed streams to the browser',
  (snapshot.sessions?.length ?? 0) > 0,
  `${snapshot.sessions?.length ?? 0} projections`
)

socket.close()

const logout = await postJson('/api/logout', {}, cookie)
const afterLogout = await getJson('/api/session', cookie)
record(
  'logout invalidates the session',
  logout.response.status === 200 &&
    (afterLogout.body as { authenticated?: boolean }).authenticated === false
)

for (const result of results) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? `  (${result.detail})` : ''}`)
}
if (results.some((result) => !result.ok)) {
  process.exitCode = 1
}
}

class TestClient {
  private readonly socket: WebSocket
  private nextId = 1
  private readonly frames: HubToWeb[] = []
  private readonly waiters = new Set<() => void>()
  readonly opened: Promise<void>

  constructor(socket: WebSocket) {
    this.socket = socket
    socket.on('message', (data) => {
      this.frames.push(JSON.parse(data.toString()) as HubToWeb)
      for (const waiter of [...this.waiters]) {
        waiter()
      }
    })
    this.opened = new Promise((resolve, reject) => {
      socket.once('open', () => resolve())
      socket.once('error', reject)
    })
  }

  async next(type: string, timeoutMs = 5_000): Promise<unknown> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const index = this.frames.findIndex((frame) => frame.type === type)
      if (index !== -1) {
        return this.frames.splice(index, 1)[0]
      }
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 250)
        this.waiters.add(() => {
          clearTimeout(timer)
          resolve()
        })
      })
    }
    throw new Error(`No ${type} frame within ${timeoutMs}ms`)
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const id = `t${this.nextId++}`
    this.socket.send(JSON.stringify({ type: 'request', id, method, params }))
    const frame = (await this.next('request-result', 20_000)) as {
      id: string
      ok: boolean
      result?: unknown
      error?: { code: string; message: string }
    }
    if (frame.id !== id) {
      throw new Error(`Mismatched response id ${frame.id}`)
    }
    if (!frame.ok) {
      throw new Error(`${method}: ${frame.error?.code} ${frame.error?.message}`)
    }
    return frame.result
  }

  async collectNonEmpty(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const id = `s${this.nextId++}`
    this.socket.send(JSON.stringify({ type: 'subscribe', id, method, params }))
    const deadline = Date.now() + timeoutMs
    let latest: { sessions?: unknown[] } | null = null
    while (Date.now() < deadline) {
      for (const frame of [...this.frames]) {
        if (frame.type !== 'stream-frame' || frame.id !== id) {
          continue
        }
        const value = frame.result as { type?: string; sessions?: unknown[] }
        if (value.type === 'snapshot' && (value.sessions?.length ?? 0) > 0) {
          latest = value
        }
      }
      if (latest) {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', id }))
        return latest
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    throw new Error(`${method} produced no non-empty snapshot`)
  }
}

async function expectUpgradeRejected(url: string): Promise<number> {
  return await new Promise((resolve) => {
    const socket = new WebSocket(url, { origin })
    socket.on('unexpected-response', (_request, response) => {
      resolve(response.statusCode ?? 0)
      socket.terminate()
    })
    socket.on('open', () => {
      resolve(101)
      socket.close()
    })
    socket.on('error', () => resolve(0))
  })
}

async function getJson(path: string, cookie?: string): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${base}${path}`, {
    headers: cookie ? { cookie } : {}
  })
  return { response, body: await response.json() }
}

async function postJson(
  path: string,
  body: unknown,
  cookie?: string
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body)
  })
  return { response, body: await response.json() }
}

function record(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, ...(detail ? { detail } : {}) })
}

await main()
