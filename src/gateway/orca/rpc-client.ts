// One authenticated Orca runtime socket: E2EE v2 handshake, then sealed JSON-RPC.
// Orca has no HTTP API; every call is a frame on this socket.
import { randomUUID } from 'node:crypto'
import { OrcaE2eeClient, type E2eeTransport } from './e2ee-v2-client.ts'
import { ORCA_WEB_CLIENT_CAPABILITIES } from './client-capabilities.ts'

export type OrcaRpcEnvelope =
  | { id: string; ok: true; result: unknown; _meta?: { runtimeId?: string } }
  | { id: string; ok: false; error: { code: string; message: string; data?: unknown } }

export class OrcaRpcError extends Error {
  readonly code: string
  readonly data: unknown

  constructor(code: string, message: string, data?: unknown) {
    super(message)
    this.name = 'OrcaRpcError'
    this.code = code
    this.data = data
  }
}

export class OrcaConnectionError extends Error {
  readonly stage: 'connect' | 'handshake' | 'auth' | 'socket'

  constructor(stage: OrcaConnectionError['stage'], message: string) {
    super(message)
    this.name = 'OrcaConnectionError'
    this.stage = stage
  }
}

export type OrcaConnectionOptions = {
  endpoint: string
  deviceToken: string
  hostPublicKeyB64: string
  transport?: E2eeTransport
  relayHostId?: string
  handshakeTimeoutMs?: number
}

type FrameListener = (envelope: OrcaRpcEnvelope) => void

const DEFAULT_HANDSHAKE_TIMEOUT_MS = 15_000
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const CLOSE_HANDSHAKE_TIMEOUT = 4002

export class OrcaConnection {
  private readonly socket: WebSocket
  private readonly deviceToken: string
  private readonly handshakeTimeoutMs: number
  private readonly listeners = new Map<string, Set<FrameListener>>()
  private closeListeners = new Set<(error: Error | null) => void>()
  private closed = false

  private constructor(
    socket: WebSocket,
    options: OrcaConnectionOptions
  ) {
    this.socket = socket
    this.deviceToken = options.deviceToken
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS
  }

  static async connect(options: OrcaConnectionOptions): Promise<OrcaConnection> {
    const socket = new WebSocket(options.endpoint)
    const connection = new OrcaConnection(socket, options)
    await connection.performHandshake(options)
    // Per-socket, not per-token: the next connection must advertise again.
    try {
      await connection.request('runtime.clientCapabilities.update', {
        clientCapabilities: [...ORCA_WEB_CLIENT_CAPABILITIES]
      })
    } catch (error) {
      // The handshake succeeded, so the socket is open; no caller can reach it to close.
      // Leaving it idle leaks one of Orca's 128 connection slots on every retry.
      connection.close()
      throw error
    }
    return connection
  }

  /** Resolves with the first response frame for this request. */
  async request<T>(
    method: string,
    params?: unknown,
    options?: { timeoutMs?: number }
  ): Promise<T> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
    const requestId = randomUUID()
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener(requestId, onFrame)
        reject(new OrcaRpcError('runtime_timeout', `${method} timed out after ${timeoutMs}ms`))
      }, timeoutMs)
      const onFrame: FrameListener = (envelope) => {
        clearTimeout(timer)
        this.removeListener(requestId, onFrame)
        if (envelope.ok) {
          resolve(envelope.result as T)
        } else {
          reject(new OrcaRpcError(envelope.error.code, envelope.error.message, envelope.error.data))
        }
      }
      this.addListener(requestId, onFrame)
      this.sendRpc(requestId, method, params)
    })
  }

  /** Every response frame for this id, including streamed and multi-part replies. */
  async subscribe(
    method: string,
    params: unknown,
    onFrame: (frame: unknown) => void
  ): Promise<{ requestId: string; close: () => void }> {
    const requestId = randomUUID()
    const listener: FrameListener = (envelope) => {
      if (envelope.ok) {
        onFrame(envelope.result)
        return
      }
      onFrame({ type: 'error', error: envelope.error })
    }
    this.addListener(requestId, listener)
    this.sendRpc(requestId, method, params)
    return {
      requestId,
      close: () => this.removeListener(requestId, listener)
    }
  }

  onClose(listener: (error: Error | null) => void): () => void {
    this.closeListeners.add(listener)
    return () => this.closeListeners.delete(listener)
  }

  close(): void {
    if (this.closed) {
      return
    }
    this.socket.close(1000, 'client closing')
  }

  private sendRpc(requestId: string, method: string, params: unknown): void {
    if (this.closed || this.socket.readyState !== WebSocket.OPEN) {
      throw new OrcaConnectionError('socket', 'Orca socket is not open')
    }
    // Undefined params are omitted: Orca's strict schemas reject unknown keys, not absent ones.
    const request = {
      id: requestId,
      deviceToken: this.deviceToken,
      method,
      ...(params === undefined ? {} : { params })
    }
    this.socket.send(this.e2ee.sealText(JSON.stringify(request)))
  }

  private e2ee!: OrcaE2eeClient

  private async performHandshake(options: OrcaConnectionOptions): Promise<void> {
    const e2ee = new OrcaE2eeClient({
      hostPublicKeyB64: options.hostPublicKeyB64,
      transport: options.transport,
      relayHostId: options.relayHostId
    })
    this.e2ee = e2ee

    await new Promise<void>((resolve, reject) => {
      let stage: OrcaConnectionError['stage'] = 'connect'
      let settled = false
      const timer = setTimeout(() => {
        fail(new OrcaConnectionError(stage, `Handshake timed out at stage ${stage}`))
      }, this.handshakeTimeoutMs)

      // Handshake listeners must be gone before RPC frames arrive: a second decrypt consumes a counter.
      const cleanup = (): void => {
        this.socket.removeEventListener('message', onMessage)
        this.socket.removeEventListener('error', onError)
        this.socket.removeEventListener('close', onClose)
        this.socket.removeEventListener('open', onOpen)
      }

      const fail = (error: Error): void => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        cleanup()
        this.socket.close()
        reject(error)
      }

      const succeed = (): void => {
        if (settled) {
          return
        }
        settled = true
        clearTimeout(timer)
        cleanup()
        resolve()
      }

      const onMessage = (event: MessageEvent): void => {
        if (settled) {
          return
        }
        if (typeof event.data !== 'string') {
          fail(new OrcaConnectionError(stage, 'Orca sent a binary frame during handshake'))
          return
        }
        const text = event.data
        if (stage === 'connect') {
          stage = 'handshake'
          if (!e2ee.acceptReady(text)) {
            fail(
              new OrcaConnectionError(
                'handshake',
                'Orca returned an e2ee_ready this client does not accept (host key or transcript mismatch)'
              )
            )
            return
          }
          this.socket.send(e2ee.authText(this.deviceToken))
          stage = 'auth'
          return
        }
        if (stage === 'auth') {
          const plaintext = e2ee.openText(text)
          if (plaintext === null) {
            fail(new OrcaConnectionError('auth', 'Orca auth reply could not be decrypted'))
            return
          }
          if (!e2ee.isAuthenticatedControl(plaintext)) {
            fail(
              new OrcaConnectionError(
                'auth',
                `Orca rejected the device token: ${describeAuthReply(plaintext)}`
              )
            )
            return
          }
          this.installSocketHandlers()
          succeed()
        }
      }

      const onError = (): void => {
        fail(new OrcaConnectionError(stage, `Could not reach Orca at ${options.endpoint}`))
      }
      const onClose = (event: CloseEvent): void => {
        fail(
          new OrcaConnectionError(
            stage,
            `Orca closed the socket during ${stage} (code ${event.code}${
              event.reason ? `: ${event.reason}` : ''
            })`
          )
        )
      }
      const onOpen = (): void => this.socket.send(e2ee.helloText())

      this.socket.addEventListener('message', onMessage)
      this.socket.addEventListener('error', onError)
      this.socket.addEventListener('close', onClose)
      this.socket.addEventListener('open', onOpen)
    })
  }

  private installSocketHandlers(): void {
    this.socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') {
        return
      }
      const plaintext = this.e2ee.openText(event.data)
      if (plaintext === null) {
        // Counter desync: the connection is unusable, and failAll() already marked it
        // closed, so close() would early-return. Tear the socket down so reconnect runs.
        this.failAll(new OrcaConnectionError('socket', 'Orca sent an undecryptable frame'))
        this.socket.close()
        return
      }
      let frame: unknown
      try {
        frame = JSON.parse(plaintext)
      } catch {
        this.failAll(new OrcaConnectionError('socket', 'Orca sent a non-JSON frame'))
        this.socket.close()
        return
      }
      if (isKeepalive(frame)) {
        return
      }
      if (!isRecord(frame) || typeof frame.id !== 'string') {
        return
      }
      const listeners = this.listeners.get(frame.id)
      if (!listeners) {
        return
      }
      const envelope = frame as OrcaRpcEnvelope
      for (const listener of [...listeners]) {
        listener(envelope)
      }
    })
    this.socket.addEventListener('close', (event) => {
      this.closed = true
      const error =
        event.code === 1000
          ? null
          : new OrcaConnectionError(
              'socket',
              `Orca closed the connection (code ${event.code}${event.reason ? `: ${event.reason}` : ''})`
            )
      this.failAll(error)
      for (const listener of [...this.closeListeners]) {
        listener(error)
      }
      this.closeListeners = new Set()
    })
  }

  private failAll(error: Error | null): void {
    this.closed = true
    for (const [id, listeners] of this.listeners) {
      for (const listener of [...listeners]) {
        listener({ id, ok: false, error: { code: 'remote_runtime_unavailable', message: error?.message ?? 'closed' } })
      }
    }
    this.listeners.clear()
  }

  private addListener(id: string, listener: FrameListener): void {
    const set = this.listeners.get(id) ?? new Set<FrameListener>()
    set.add(listener)
    this.listeners.set(id, set)
  }

  private removeListener(id: string, listener: FrameListener): void {
    const set = this.listeners.get(id)
    if (!set) {
      return
    }
    set.delete(listener)
    if (set.size === 0) {
      this.listeners.delete(id)
    }
  }
}

function isKeepalive(frame: unknown): boolean {
  return isRecord(frame) && frame._keepalive === true
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeAuthReply(plaintext: string): string {
  try {
    const reply = JSON.parse(plaintext) as Record<string, unknown>
    const error = isRecord(reply.error) ? reply.error : null
    return [reply.type, error?.code, error?.message].filter(Boolean).join(' ') || plaintext
  } catch {
    return plaintext.slice(0, 200)
  }
}

export { CLOSE_HANDSHAKE_TIMEOUT }
