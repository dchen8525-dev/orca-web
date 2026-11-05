// Browser side of the hub link: cookie-authenticated WebSocket with reconnect and resubscribe.
export type HubStatus = {
  connected: boolean
  gatewayConnected: boolean
  orcaState: string | null
  message?: string
  /** The server no longer accepts this cookie: show the login form instead of retrying. */
  authExpired?: boolean
}

export type StreamEvent =
  | { kind: 'frame'; result: unknown }
  | { kind: 'error'; code: string; message: string }
  | { kind: 'reset' }

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

type Subscription = {
  id: string
  method: string
  params: unknown
  onEvent: (event: StreamEvent) => void
}

const REQUEST_TIMEOUT_MS = 30_000
const PING_MS = 25_000
const SILENCE_MS = 75_000

export class HubClient {
  private socket: WebSocket | null = null
  private status: HubStatus = {
    connected: false,
    gatewayConnected: false,
    orcaState: null
  }
  private readonly statusListeners = new Set<(status: HubStatus) => void>()
  private readonly pending = new Map<string, Pending>()
  private readonly subscriptions = new Map<string, Subscription>()
  private nextId = 1
  private closed = false
  private attempt = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private lastFrameAt = 0

  connect(): void {
    this.closed = false
    void this.open()
  }

  close(): void {
    this.closed = true
    this.stopPing()
    this.socket?.close(1000, 'closing')
    this.socket = null
  }

  onStatus(listener: (status: HubStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  async request<T>(method: string, params?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected')
    }
    const id = `r${this.nextId++}`
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} timed out`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer
      })
      socket.send(JSON.stringify({ type: 'request', id, method, params, timeoutMs }))
    })
  }

  /** Returns an unsubscribe function. Survives socket reconnects. */
  subscribe(method: string, params: unknown, onEvent: (event: StreamEvent) => void): () => void {
    const subscription: Subscription = { id: `s${this.nextId++}`, method, params, onEvent }
    this.subscriptions.set(subscription.id, subscription)
    this.sendSubscription(subscription)
    return () => {
      this.subscriptions.delete(subscription.id)
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'unsubscribe', id: subscription.id }))
      }
    }
  }

  private async open(): Promise<void> {
    if (this.closed) {
      return
    }
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${scheme}://${location.host}/client`)
    this.socket = socket
    // A socket that never said hello was rejected at the upgrade; retrying cannot fix that.
    let admitted = false

    socket.addEventListener('message', (event) => {
      this.lastFrameAt = Date.now()
      if (typeof event.data !== 'string') {
        return
      }
      let frame: Record<string, unknown>
      try {
        frame = JSON.parse(event.data) as Record<string, unknown>
      } catch {
        return
      }
      if (frame.type === 'welcome') {
        admitted = true
      }
      this.handleFrame(frame)
    })

    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.socket = null
      }
      this.stopPing()
      this.setStatus({ ...this.status, connected: false, gatewayConnected: false })
      this.rejectPending(new Error('Connection closed'))
      if (this.closed) {
        return
      }
      if (admitted) {
        setTimeout(() => void this.open(), backoffMs(this.attempt++))
        return
      }
      void this.reopenOrSignOut()
    })

    socket.addEventListener('open', () => {
      this.attempt = 0
      this.lastFrameAt = Date.now()
      this.setStatus({ ...this.status, connected: true })
      this.startPing()
      // The hub forgot our streams with the old socket; re-register them.
      for (const subscription of this.subscriptions.values()) {
        this.sendSubscription(subscription)
        subscription.onEvent({ kind: 'reset' })
      }
    })
  }

  /** Distinguishes a dropped network from a cookie the server no longer honours. */
  private async reopenOrSignOut(): Promise<void> {
    let authenticated = true
    try {
      const response = await fetch('/api/session', { cache: 'no-store' })
      authenticated = response.ok
        ? Boolean(((await response.json()) as { authenticated?: boolean }).authenticated)
        : false
    } catch {
      // Server unreachable is not proof of a bad cookie.
    }
    if (this.closed) {
      return
    }
    if (!authenticated) {
      this.closed = true
      this.setStatus({
        connected: false,
        gatewayConnected: false,
        orcaState: null,
        authExpired: true
      })
      return
    }
    setTimeout(() => void this.open(), backoffMs(this.attempt++))
  }

  private handleFrame(frame: Record<string, unknown>): void {
    switch (frame.type) {
      case 'welcome':
      case 'gateway-state': {
        const gatewayConnected =
          frame.type === 'welcome' ? Boolean(frame.gatewayConnected) : Boolean(frame.connected)
        this.setStatus({
          connected: this.status.connected,
          gatewayConnected,
          orcaState: (frame.orcaState as string | null) ?? null,
          ...(typeof frame.message === 'string' ? { message: frame.message } : {})
        })
        return
      }
      case 'request-result': {
        const id = String(frame.id)
        const entry = this.pending.get(id)
        if (!entry) {
          return
        }
        this.pending.delete(id)
        clearTimeout(entry.timer)
        if (frame.ok) {
          entry.resolve(frame.result)
        } else {
          const error = frame.error as { code?: string; message?: string } | undefined
          entry.reject(new Error(`${error?.code ?? 'error'}: ${error?.message ?? 'request failed'}`))
        }
        return
      }
      case 'stream-frame':
      case 'stream-error':
      case 'stream-reset': {
        const subscription = this.subscriptions.get(String(frame.id))
        if (!subscription) {
          return
        }
        if (frame.type === 'stream-frame') {
          subscription.onEvent({ kind: 'frame', result: frame.result })
        } else if (frame.type === 'stream-error') {
          const error = frame.error as { code?: string; message?: string }
          subscription.onEvent({
            kind: 'error',
            code: error?.code ?? 'error',
            message: error?.message ?? 'stream failed'
          })
        } else {
          subscription.onEvent({ kind: 'reset' })
        }
        return
      }
      case 'pong':
        return
    }
  }

  private sendSubscription(subscription: Subscription): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return
    }
    this.socket.send(
      JSON.stringify({
        type: 'subscribe',
        id: subscription.id,
        method: subscription.method,
        params: subscription.params
      })
    )
  }

  private rejectPending(error: Error): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer)
      entry.reject(error)
      this.pending.delete(id)
    }
  }

  private setStatus(status: HubStatus): void {
    this.status = status
    for (const listener of [...this.statusListeners]) {
      listener(status)
    }
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastFrameAt > SILENCE_MS) {
        this.socket?.close(4004, 'silent')
        return
      }
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }))
      }
    }, PING_MS)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

function backoffMs(attempt: number): number {
  return Math.round(Math.min(15_000, 500 * 2 ** Math.min(attempt, 6)) * (0.8 + Math.random() * 0.4))
}
