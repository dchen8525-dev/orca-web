// Routes browser RPC to the one home gateway and fans stream frames back out.
import { createHash, timingSafeEqual } from 'node:crypto'
import type { WebSocket } from 'ws'
import type { GatewayFrame, HubFrame, LinkError, OrcaDescriptor, OrcaState } from '../../../src/shared/link-protocol.ts'
import type { HubToWeb, WebToHub } from '../../../src/shared/web-protocol.ts'
import { WEB_PROTOCOL_VERSION } from '../../../src/shared/web-protocol.ts'

type ClientConnection = {
  id: string
  socket: WebSocket
  nextId: number
  pending: Map<string, string>
  subscriptions: Map<string, { gatewayId: string; method: string; params: unknown }>
}

const HELLO_TIMEOUT_MS = 5_000

export class Hub {
  private readonly gatewayKey: string
  private readonly log: (message: string) => void
  private gateway: WebSocket | null = null
  private gatewayId: string | null = null
  private orcaState: OrcaState | null = null
  private descriptor: OrcaDescriptor | undefined
  private readonly clients = new Map<WebSocket, ClientConnection>()
  private readonly pending = new Map<string, { client: ClientConnection; localId: string }>()
  private readonly subscriptions = new Map<string, { client: ClientConnection; localId: string }>()
  private nextClientId = 1

  constructor(options: { gatewayKey: string; log: (message: string) => void }) {
    this.gatewayKey = options.gatewayKey
    this.log = options.log
  }

  getGatewayState(): { connected: boolean; orcaState: OrcaState | null; orca?: OrcaDescriptor } {
    return {
      connected: this.gateway !== null,
      orcaState: this.orcaState,
      ...(this.descriptor ? { orca: this.descriptor } : {})
    }
  }

  /** Accepts the connection but admits it only after a valid hello. */
  attachGateway(socket: WebSocket): void {
    const timer = setTimeout(() => {
      safeSend(socket, { type: 'reject', code: 'hello_timeout', message: 'No hello frame' })
      socket.close(4001, 'hello timeout')
    }, HELLO_TIMEOUT_MS)

    socket.on('message', (data) => {
      let frame: GatewayFrame
      try {
        frame = JSON.parse(data.toString()) as GatewayFrame
      } catch {
        return
      }
      if (socket !== this.gateway) {
        if (frame.type !== 'hello') {
          socket.close(4001, 'hello required')
          return
        }
        if (!this.verifyKey(frame.key)) {
          this.log('gateway rejected: bad key')
          safeSend(socket, { type: 'reject', code: 'unauthorized', message: 'Bad gateway key' })
          socket.close(4003, 'unauthorized')
          return
        }
        clearTimeout(timer)
        this.admitGateway(socket, frame)
        return
      }
      this.handleGatewayFrame(socket, frame)
    })

    socket.on('close', () => {
      clearTimeout(timer)
      if (socket === this.gateway) {
        this.dropGateway()
      }
    })
    socket.on('error', () => {
      if (socket === this.gateway) {
        this.dropGateway()
      }
    })
  }

  attachClient(socket: WebSocket): void {
    const client: ClientConnection = {
      id: `client${this.nextClientId++}`,
      socket,
      nextId: 1,
      pending: new Map(),
      subscriptions: new Map()
    }
    this.clients.set(socket, client)
    this.send(client, {
      type: 'welcome',
      v: WEB_PROTOCOL_VERSION,
      gatewayConnected: this.gateway !== null,
      orcaState: this.orcaState,
      ...(this.descriptor ? { orca: this.descriptor } : {})
    })

    socket.on('message', (data) => {
      let frame: WebToHub
      try {
        frame = JSON.parse(data.toString()) as WebToHub
      } catch {
        return
      }
      this.handleClientFrame(client, frame)
    })
    socket.on('close', () => this.dropClient(client))
    socket.on('error', () => this.dropClient(client))
  }

  /** Called on shutdown so browsers see an explicit close rather than a dead socket. */
  closeAll(): void {
    for (const client of this.clients.values()) {
      client.socket.close(1001, 'server shutting down')
    }
    this.gateway?.close(1001, 'server shutting down')
  }

  private admitGateway(socket: WebSocket, hello: Extract<GatewayFrame, { type: 'hello' }>): void {
    if (this.gateway) {
      this.log('replacing the previous gateway connection')
      const previous = this.gateway
      this.gateway = null
      previous.close(4009, 'replaced by a new gateway connection')
    }
    this.gateway = socket
    this.gatewayId = hello.gatewayId
    this.orcaState = hello.orcaState
    this.descriptor = hello.orca
    this.log(`gateway ${hello.gatewayId} connected (orca=${hello.orcaState})`)
    safeSend(socket, { type: 'welcome', gatewayId: hello.gatewayId } satisfies HubFrame)

    // Requests parked on the previous socket will never answer; fail them now instead of
    // letting every browser wait out its own 30s timeout.
    this.failPending({ code: 'remote_runtime_unavailable', message: 'Home gateway reconnected' })
    this.broadcastState(true)

    // The hub owns subscription ids; replay them so a reconnect resumes every stream.
    for (const client of this.clients.values()) {
      for (const [localId, subscription] of client.subscriptions) {
        this.sendToGateway({
          type: 'subscribe',
          id: subscription.gatewayId,
          method: subscription.method,
          params: subscription.params
        })
        this.send(client, { type: 'stream-reset', id: localId })
      }
    }
  }

  private dropGateway(): void {
    if (!this.gateway) {
      return
    }
    this.gateway = null
    this.gatewayId = null
    this.orcaState = null
    this.log('gateway disconnected')
    this.failPending({ code: 'remote_runtime_unavailable', message: 'Home gateway is not connected' })
    this.broadcastState(false)
  }

  /** Answers every in-flight browser request with an error and forgets it. */
  private failPending(error: LinkError): void {
    for (const [gatewayId, entry] of this.pending) {
      this.pending.delete(gatewayId)
      entry.client.pending.delete(entry.localId)
      this.send(entry.client, { type: 'request-result', id: entry.localId, ok: false, error })
    }
  }

  private handleGatewayFrame(socket: WebSocket, frame: GatewayFrame): void {
    switch (frame.type) {
      case 'request-result': {
        const entry = this.pending.get(frame.id)
        if (!entry) {
          return
        }
        this.pending.delete(frame.id)
        entry.client.pending.delete(entry.localId)
        this.send(
          entry.client,
          frame.ok
            ? { type: 'request-result', id: entry.localId, ok: true, result: frame.result }
            : { type: 'request-result', id: entry.localId, ok: false, error: frame.error }
        )
        return
      }
      case 'stream-frame':
      case 'stream-error':
      case 'stream-reset': {
        const entry = this.subscriptions.get(frame.id)
        if (!entry) {
          return
        }
        if (frame.type === 'stream-frame') {
          this.send(entry.client, { type: 'stream-frame', id: entry.localId, result: frame.result })
        } else if (frame.type === 'stream-error') {
          this.send(entry.client, { type: 'stream-error', id: entry.localId, error: frame.error })
        } else {
          this.send(entry.client, { type: 'stream-reset', id: entry.localId })
        }
        return
      }
      case 'orca-state':
        this.orcaState = frame.state
        this.broadcastState(true, frame.message)
        return
      case 'ping':
        // The gateway probes for liveness; silence here reads as a dead hub after 75s.
        safeSend(socket, { type: 'pong' })
        return
      case 'pong':
        return
      case 'hello':
        return
    }
  }

  private handleClientFrame(client: ClientConnection, frame: WebToHub): void {
    switch (frame.type) {
      case 'ping':
        this.send(client, { type: 'pong' })
        return
      case 'request':
        this.handleClientRequest(client, frame)
        return
      case 'subscribe':
        this.handleClientSubscribe(client, frame)
        return
      case 'unsubscribe': {
        const subscription = client.subscriptions.get(frame.id)
        if (!subscription) {
          return
        }
        client.subscriptions.delete(frame.id)
        this.subscriptions.delete(subscription.gatewayId)
        this.sendToGateway({ type: 'unsubscribe', id: subscription.gatewayId })
        return
      }
    }
  }

  private handleClientRequest(
    client: ClientConnection,
    frame: Extract<WebToHub, { type: 'request' }>
  ): void {
    if (!this.gateway) {
      this.send(client, {
        type: 'request-result',
        id: frame.id,
        ok: false,
        error: { code: 'remote_runtime_unavailable', message: 'Home gateway is not connected' }
      })
      return
    }
    const gatewayId = this.newGatewayId(client)
    client.pending.set(frame.id, gatewayId)
    this.pending.set(gatewayId, { client, localId: frame.id })
    this.sendToGateway({
      type: 'request',
      id: gatewayId,
      method: frame.method,
      ...(frame.params === undefined ? {} : { params: frame.params }),
      ...(frame.timeoutMs === undefined ? {} : { timeoutMs: frame.timeoutMs })
    })
  }

  private handleClientSubscribe(
    client: ClientConnection,
    frame: Extract<WebToHub, { type: 'subscribe' }>
  ): void {
    const gatewayId = this.newGatewayId(client)
    client.subscriptions.set(frame.id, { gatewayId, method: frame.method, params: frame.params })
    this.subscriptions.set(gatewayId, { client, localId: frame.id })
    if (this.gateway) {
      this.sendToGateway({
        type: 'subscribe',
        id: gatewayId,
        method: frame.method,
        params: frame.params
      })
    }
  }

  private dropClient(client: ClientConnection): void {
    if (!this.clients.delete(client.socket)) {
      return
    }
    for (const gatewayId of client.pending.values()) {
      this.pending.delete(gatewayId)
    }
    for (const subscription of client.subscriptions.values()) {
      this.subscriptions.delete(subscription.gatewayId)
      this.sendToGateway({ type: 'unsubscribe', id: subscription.gatewayId })
    }
  }

  private newGatewayId(client: ClientConnection): string {
    return `${client.id}-${client.nextId++}`
  }

  private verifyKey(key: unknown): boolean {
    if (typeof key !== 'string') {
      return false
    }
    const expected = createHash('sha256').update(this.gatewayKey).digest()
    const actual = createHash('sha256').update(key).digest()
    return timingSafeEqual(expected, actual)
  }

  private broadcastState(connected: boolean, message?: string): void {
    for (const client of this.clients.values()) {
      this.send(client, {
        type: 'gateway-state',
        connected,
        orcaState: this.orcaState,
        ...(message ? { message } : {})
      })
    }
  }

  private sendToGateway(frame: HubFrame): void {
    if (!this.gateway) {
      return
    }
    safeSend(this.gateway, frame)
  }

  private send(client: ClientConnection, frame: HubToWeb): void {
    safeSend(client.socket, frame)
  }
}

function safeSend(socket: WebSocket, frame: unknown): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(frame))
  }
}

export type { LinkError }
