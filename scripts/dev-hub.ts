// Local stand-in for the VPS hub: accepts one gateway, runs a read scenario, prints results.
// Lets the gateway be developed and tested without deploying anything.
import { createServer } from 'node:http'
import { WebSocketServer, type WebSocket } from 'ws'
import { LINK_PROTOCOL_VERSION, type GatewayFrame, type HubFrame } from '../src/shared/link-protocol.ts'

const port = Number(process.env.DEV_HUB_PORT ?? 8787)
const gatewayKey = process.env.DEV_GATEWAY_KEY ?? 'dev-gateway-key'
const once = process.argv.includes('--once')

const httpServer = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/plain' }).end('dev hub\n')
})
const wss = new WebSocketServer({ server: httpServer })

wss.on('connection', (socket) => {
  void serveGateway(socket)
})

httpServer.listen(port, '127.0.0.1', () => {
  log(`dev hub listening on ws://127.0.0.1:${port}`)
})

async function serveGateway(socket: WebSocket): Promise<void> {
  const session = new HubSession(socket)
  const hello = await session.waitForHello()
  if (!hello) {
    session.send({ type: 'reject', code: 'bad_hello', message: 'Expected a gateway hello' })
    socket.close(4001, 'bad hello')
    return
  }
  if (hello.key !== gatewayKey) {
    log('rejected gateway: bad key')
    session.send({ type: 'reject', code: 'unauthorized', message: 'Bad gateway key' })
    socket.close(4003, 'bad key')
    return
  }
  log(`gateway ${hello.gatewayId} connected (orca=${hello.orcaState} app=${hello.orca?.appVersion ?? '?'})`)
  session.send({ type: 'welcome', gatewayId: hello.gatewayId })

  try {
    await runScenario(session)
  } catch (error) {
    log(`scenario failed: ${(error as Error).message}`)
  }
  if (once) {
    socket.close(1000, 'done')
    httpServer.close()
  }
}

async function runScenario(session: HubSession): Promise<void> {
  const status = await session.request<Record<string, unknown>>('status.get')
  log(`status.get    app=${String(status.appVersion)} protocol=${String(status.runtimeProtocolVersion)}`)

  const projects = await session.request<{ projects: { displayName: string }[] }>('project.list', {})
  log(`project.list  ${projects.projects.map((project) => project.displayName).join(', ')}`)

  const ps = await session.request<{
    worktrees: { worktreeId: string; displayName?: string; agents?: { state: string; paneKey: string }[] }[]
  }>('worktree.ps', {})
  const tasks = ps.worktrees.flatMap((row) => row.agents ?? [])
  log(`worktree.ps   ${ps.worktrees.length} worktrees, ${tasks.length} tasks`)

  const statusFrames = await session.collect('status-feed', 'agentSession.subscribeStatus', {}, (frame) => {
    const event = frame as { type?: string; sessions?: unknown[] }
    return event.type === 'snapshot' && Array.isArray(event.sessions) && event.sessions.length > 0
  })
  const snapshot = statusFrames.at(-1) as { sessions?: { sessionId: string; status: string | null }[] }
  log(`status feed   ${snapshot.sessions?.length ?? 0} projections after ${statusFrames.length} snapshot(s)`)

  const sessionId =
    snapshot.sessions?.[0]?.sessionId ??
    (tasks[0]?.paneKey ? /^structured-agent-session-(.+):[^:]+$/.exec(tasks[0].paneKey)?.[1] : undefined)
  if (sessionId) {
    const history = await session.request<{ page?: { items: unknown[]; fence?: number } }>(
      'agentSession.history',
      { sessionId, direction: 'tail', limit: 3 }
    )
    log(`history       ${history.page?.items.length ?? 0} items (fence ${history.page?.fence ?? '?'})`)
  }
}

class HubSession {
  private nextId = 1
  private readonly pending = new Map<
    string,
    { resolve: (frame: GatewayFrame) => void; reject: (error: Error) => void }
  >()
  private readonly streamFrames = new Map<string, unknown[]>()
  private readonly streamWaiters = new Map<string, () => void>()
  private helloTimer: ReturnType<typeof setTimeout> | null = null
  private hello: { v: number; key: string; gatewayId: string; orcaState: string; orca?: { appVersion?: string } } | null =
    null
  private readonly socket: WebSocket

  constructor(socket: WebSocket) {
    this.socket = socket
    socket.on('message', (data) => this.handle(JSON.parse(data.toString()) as GatewayFrame))
    socket.on('close', () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error('gateway disconnected'))
      }
      this.pending.clear()
    })
  }

  send(frame: HubFrame): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(frame))
    }
  }

  waitForHello(): Promise<typeof this.hello> {
    return new Promise((resolve) => {
      this.helloTimer = setTimeout(() => resolve(null), 5_000)
      const check = setInterval(() => {
        if (this.hello) {
          clearInterval(check)
          if (this.helloTimer) {
            clearTimeout(this.helloTimer)
          }
          resolve(this.hello)
        }
      }, 50)
    })
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    const id = `req-${this.nextId++}`
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} timed out`))
      }, 20_000)
      this.pending.set(id, {
        resolve: (frame) => {
          clearTimeout(timer)
          if (frame.type !== 'request-result') {
            reject(new Error(`${method}: unexpected frame ${frame.type}`))
            return
          }
          if (frame.ok) {
            resolve(frame.result as T)
          } else {
            reject(new Error(`${method}: ${frame.error.code} ${frame.error.message}`))
          }
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        }
      })
      this.send({ type: 'request', id, method, ...(params === undefined ? {} : { params }) })
    })
  }

  async collect(
    id: string,
    method: string,
    params: unknown,
    done: (frame: unknown) => boolean
  ): Promise<unknown[]> {
    this.streamFrames.set(id, [])
    this.send({ type: 'subscribe', id, method, params })
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 12_000)
      const check = setInterval(() => {
        const frames = this.streamFrames.get(id) ?? []
        if (frames.some(done)) {
          clearInterval(check)
          clearTimeout(timer)
          resolve()
        }
      }, 100)
    })
    this.send({ type: 'unsubscribe', id })
    return this.streamFrames.get(id) ?? []
  }

  private handle(frame: GatewayFrame): void {
    if (frame.type === 'hello') {
      this.hello = frame
      return
    }
    if (frame.type === 'request-result') {
      const pending = this.pending.get(frame.id)
      if (pending) {
        this.pending.delete(frame.id)
        pending.resolve(frame)
      }
      return
    }
    if (frame.type === 'stream-frame' || frame.type === 'stream-reset') {
      const frames = this.streamFrames.get(frame.id)
      if (frames && frame.type === 'stream-frame') {
        frames.push(frame.result)
      }
      this.streamWaiters.get(frame.id)?.()
      return
    }
    if (frame.type === 'stream-error') {
      log(`stream ${frame.id} error: ${frame.error.code} ${frame.error.message}`)
      return
    }
    if (frame.type === 'orca-state') {
      log(`orca state    ${frame.state}${frame.message ? `: ${frame.message}` : ''}`)
    }
  }
}

function log(message: string): void {
  console.log(`${new Date().toISOString()} ${message}`)
}
