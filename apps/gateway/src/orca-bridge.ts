// Keeps one live Orca connection for the hub: reconnects, re-advertises capabilities (per socket),
// and replays every subscription the hub asked for.
import {
  OrcaConnection,
  OrcaRpcError,
  OrcaConnectionError,
  type OrcaConnectionOptions
} from '../../../src/gateway/orca/rpc-client.ts'
import type { LinkError, OrcaDescriptor, OrcaState } from '../../../src/shared/link-protocol.ts'

export type BridgeEvent =
  | { kind: 'state'; state: OrcaState; message?: string }
  | { kind: 'orca'; descriptor: OrcaDescriptor }
  | { kind: 'stream-frame'; id: string; result: unknown }
  | { kind: 'stream-error'; id: string; error: LinkError }
  | { kind: 'stream-reset'; id: string }

type Subscription = {
  method: string
  params: unknown
  handle: { close: () => void } | null
}

const RETRY_BASE_MS = 500
const RETRY_MAX_MS = 30_000

export class OrcaBridge {
  private connection: OrcaConnection | null = null
  private state: OrcaState = 'connecting'
  private descriptor: OrcaDescriptor = {}
  private readonly subscriptions = new Map<string, Subscription>()
  private readonly listeners = new Set<(event: BridgeEvent) => void>()
  private stopped = false
  private loop: Promise<void> | null = null
  private readonly options: OrcaConnectionOptions

  constructor(options: OrcaConnectionOptions) {
    this.options = options
  }

  onEvent(listener: (event: BridgeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState(): OrcaState {
    return this.state
  }

  getDescriptor(): OrcaDescriptor {
    return this.descriptor
  }

  start(): void {
    if (!this.loop) {
      this.loop = this.run()
    }
  }

  async stop(): Promise<void> {
    this.stopped = true
    this.closeSubscriptions()
    this.connection?.close()
    this.connection = null
    await this.loop?.catch(() => {})
  }

  async request(method: string, params: unknown, timeoutMs?: number): Promise<unknown> {
    const connection = this.connection
    if (!connection) {
      throw new BridgeError('remote_runtime_unavailable', 'Desktop Orca is not connected')
    }
    return await connection.request(method, params, {
      ...(timeoutMs === undefined ? {} : { timeoutMs })
    })
  }

  subscribe(id: string, method: string, params: unknown): void {
    const existing = this.subscriptions.get(id)
    existing?.handle?.close()
    const subscription: Subscription = { method, params, handle: null }
    this.subscriptions.set(id, subscription)
    void this.openSubscription(id, subscription)
  }

  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id)
    if (!subscription) {
      return
    }
    subscription.handle?.close()
    this.subscriptions.delete(id)
    // Closing the local handle does not tell Orca; transcripts otherwise accumulate server-side.
    const sessionId = (subscription.params as { sessionId?: unknown } | undefined)?.sessionId
    if (subscription.method === 'agentSession.subscribe' && typeof sessionId === 'string') {
      void this.connection
        ?.request('agentSession.unsubscribe', { sessionId })
        .catch(() => {})
    }
  }

  unsubscribeAll(): void {
    this.closeSubscriptions()
    this.subscriptions.clear()
  }

  private async openSubscription(id: string, subscription: Subscription): Promise<void> {
    const connection = this.connection
    if (!connection) {
      return
    }
    try {
      const handle = await connection.subscribe(subscription.method, subscription.params, (frame) => {
        if (this.subscriptions.get(id) !== subscription) {
          return
        }
        if (isStreamError(frame)) {
          this.emit({ kind: 'stream-error', id, error: toLinkError(frame.error) })
          return
        }
        this.emit({ kind: 'stream-frame', id, result: frame })
      })
      // A reconnect may have replaced the subscription while subscribe() was awaited.
      if (this.subscriptions.get(id) !== subscription) {
        handle.close()
        return
      }
      subscription.handle = handle
    } catch (error) {
      this.emit({ kind: 'stream-error', id, error: toLinkError(error) })
    }
  }

  private async run(): Promise<void> {
    let attempt = 0
    while (!this.stopped) {
      this.setState('connecting')
      try {
        const connection = await OrcaConnection.connect(this.options)
        if (this.stopped) {
          connection.close()
          return
        }
        this.connection = connection
        attempt = 0
        this.setState('connected')
        const closed = new Promise<void>((resolve) => {
          connection.onClose((error) => {
            if (this.connection === connection) {
              this.connection = null
              this.closeSubscriptions()
              this.setState('disconnected', error?.message)
            }
            resolve()
          })
        })
        // Capabilities are per socket, so connect() re-sent them before this point.
        try {
          await this.readDescriptor(connection)
          await this.replaySubscriptions()
        } catch {
          connection.close()
        }
        await closed
      } catch (error) {
        if (this.stopped) {
          return
        }
        this.connection = null
        this.setState('disconnected', describeError(error))
      }
      if (this.stopped) {
        return
      }
      await delay(backoffMs(attempt++))
    }
  }

  private async readDescriptor(connection: OrcaConnection): Promise<void> {
    try {
      const status = await connection.request<{
        appVersion?: string
        runtimeProtocolVersion?: number
        hostPlatform?: string
        machineName?: string
      }>('status.get')
      this.descriptor = {
        ...(status.appVersion ? { appVersion: status.appVersion } : {}),
        ...(status.runtimeProtocolVersion !== undefined
          ? { protocolVersion: status.runtimeProtocolVersion }
          : {}),
        ...(status.hostPlatform ? { hostPlatform: status.hostPlatform } : {}),
        ...(status.machineName ? { machineName: status.machineName } : {})
      }
      this.emit({ kind: 'orca', descriptor: this.descriptor })
    } catch {
      // A descriptor is informative only; the connection already proved itself.
    }
  }

  private async replaySubscriptions(): Promise<void> {
    for (const [id, subscription] of [...this.subscriptions]) {
      // The old stream ended with the previous socket: tell the hub before the new frames.
      this.emit({ kind: 'stream-reset', id })
      await this.openSubscription(id, subscription)
    }
  }

  private closeSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.handle?.close()
      subscription.handle = null
    }
  }

  private setState(state: OrcaState, message?: string): void {
    if (this.state === state && !message) {
      return
    }
    this.state = state
    this.emit({ kind: 'state', state, ...(message ? { message } : {}) })
  }

  private emit(event: BridgeEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event)
    }
  }
}

export class BridgeError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'BridgeError'
    this.code = code
  }
}

function backoffMs(attempt: number): number {
  const exponential = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt)
  return Math.round(exponential * (0.8 + Math.random() * 0.4))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function describeError(error: unknown): string {
  if (error instanceof OrcaConnectionError || error instanceof OrcaRpcError) {
    return error.message
  }
  return error instanceof Error ? error.message : String(error)
}

function isStreamError(value: unknown): value is { type: 'error'; error: LinkError } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'error' &&
    typeof (value as { error?: unknown }).error === 'object'
  )
}

export function toLinkError(error: unknown): LinkError {
  if (error instanceof BridgeError) {
    return { code: error.code, message: error.message }
  }
  if (error instanceof OrcaRpcError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.data === undefined ? {} : { data: error.data })
    }
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as { code?: unknown; message?: unknown; data?: unknown }
    if (typeof record.code === 'string' && typeof record.message === 'string') {
      return {
        code: record.code,
        message: record.message,
        ...(record.data === undefined ? {} : { data: record.data })
      }
    }
  }
  return {
    code: 'remote_runtime_unavailable',
    message: error instanceof Error ? error.message : String(error)
  }
}
