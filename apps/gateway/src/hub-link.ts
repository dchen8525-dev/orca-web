// Outbound connection to the VPS hub. The gateway never listens on a public port.
import type { GatewayFrame, HubFrame } from '../../../src/shared/link-protocol.ts'
import { LINK_PROTOCOL_VERSION } from '../../../src/shared/link-protocol.ts'
import { OrcaBridge, toLinkError, type BridgeEvent } from './orca-bridge.ts'

export type HubLinkOptions = {
  url: string
  key: string
  gatewayId: string
  bridge: OrcaBridge
  log: (message: string) => void
}

const RETRY_BASE_MS = 500
const RETRY_MAX_MS = 30_000
const PING_INTERVAL_MS = 25_000
const SILENCE_TIMEOUT_MS = 75_000

export class HubLink {
  private socket: WebSocket | null = null
  private stopped = false
  private attempt = 0
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private lastFrameAt = 0
  private readonly unsubscribeBridge: () => void
  private readonly options: HubLinkOptions

  constructor(options: HubLinkOptions) {
    this.options = options
    this.unsubscribeBridge = options.bridge.onEvent((event) => this.forward(event))
  }

  start(): void {
    void this.run()
  }

  isConnected(): boolean {
    return this.socket !== null
  }

  stop(): void {
    this.stopped = true
    this.stopPing()
    this.unsubscribeBridge()
    this.socket?.close(1000, 'gateway stopping')
    this.socket = null
  }

  private async run(): Promise<void> {
    while (!this.stopped) {
      await this.connectOnce()
      if (this.stopped) {
        return
      }
      await delay(backoffMs(this.attempt++))
    }
  }

  private async connectOnce(): Promise<void> {
    const socket = new WebSocket(this.options.url)
    this.socket = socket

    await new Promise<void>((resolve) => {
      let settled = false
      const finish = (): void => {
        if (settled) {
          return
        }
        settled = true
        resolve()
      }

      socket.addEventListener('open', () => {
        this.attempt = 0
        this.options.log(`hub connected: ${this.options.url}`)
        this.send({
          type: 'hello',
          v: LINK_PROTOCOL_VERSION,
          key: this.options.key,
          gatewayId: this.options.gatewayId,
          orcaState: this.options.bridge.getState(),
          ...(Object.keys(this.options.bridge.getDescriptor()).length
            ? { orca: this.options.bridge.getDescriptor() }
            : {})
        })
        this.lastFrameAt = Date.now()
        this.startPing()
      })

      socket.addEventListener('message', (event) => {
        this.lastFrameAt = Date.now()
        if (typeof event.data !== 'string') {
          return
        }
        let frame: unknown
        try {
          frame = JSON.parse(event.data)
        } catch {
          return
        }
        if (isHubFrame(frame)) {
          this.handleFrame(frame)
        }
      })

      socket.addEventListener('error', () => finish())
      socket.addEventListener('close', (event) => {
        this.stopPing()
        if (this.socket === socket) {
          this.socket = null
        }
        // The hub re-issues subscriptions after reconnecting; drop ours so nothing stale streams.
        this.options.bridge.unsubscribeAll()
        if (!this.stopped) {
          this.options.log(`hub disconnected (code ${event.code})`)
        }
        finish()
      })
    })
  }

  private handleFrame(frame: HubFrame): void {
    switch (frame.type) {
      case 'welcome':
        this.options.log(`hub accepted gateway ${frame.gatewayId}`)
        return
      case 'reject':
        this.options.log(`hub rejected the gateway: ${frame.code} ${frame.message}`)
        this.socket?.close(4003, 'rejected')
        return
      case 'ping':
        this.send({ type: 'pong' })
        return
      case 'pong':
        return
      case 'request':
        void this.handleRequest(frame.id, frame.method, frame.params, frame.timeoutMs)
        return
      case 'subscribe':
        this.options.bridge.subscribe(frame.id, frame.method, frame.params)
        return
      case 'unsubscribe':
        this.options.bridge.unsubscribe(frame.id)
        return
    }
  }

  private async handleRequest(
    id: string,
    method: string,
    params: unknown,
    timeoutMs: number | undefined
  ): Promise<void> {
    try {
      const result = await this.options.bridge.request(method, params, timeoutMs)
      this.send({ type: 'request-result', id, ok: true, result })
    } catch (error) {
      this.send({ type: 'request-result', id, ok: false, error: toLinkError(error) })
    }
  }

  private forward(event: BridgeEvent): void {
    switch (event.kind) {
      case 'state':
        this.send({
          type: 'orca-state',
          state: event.state,
          ...(event.message ? { message: event.message } : {})
        })
        return
      case 'orca':
        // The next connection's hello carries the descriptor; nothing to push mid-connection.
        return
      case 'stream-frame':
        this.send({ type: 'stream-frame', id: event.id, result: event.result })
        return
      case 'stream-error':
        this.send({ type: 'stream-error', id: event.id, error: event.error })
        return
      case 'stream-reset':
        this.send({ type: 'stream-reset', id: event.id })
        return
    }
  }

  private send(frame: GatewayFrame): void {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }
    socket.send(JSON.stringify(frame))
  }

  private startPing(): void {
    this.stopPing()
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastFrameAt > SILENCE_TIMEOUT_MS) {
        // Half-open sockets never fire close; drop it and let the loop redial.
        this.socket?.close(4004, 'hub silent')
        return
      }
      this.send({ type: 'ping' })
    }, PING_INTERVAL_MS)
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}

function isHubFrame(value: unknown): value is HubFrame {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

function backoffMs(attempt: number): number {
  const exponential = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.min(attempt, 10))
  return Math.round(exponential * (0.8 + Math.random() * 0.4))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
