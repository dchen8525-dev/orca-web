// Wire contract between the home gateway and the VPS hub. One JSON text frame per message.
// The hub never sees Orca credentials: the gateway holds the device token and speaks E2EE to Orca.
export const LINK_PROTOCOL_VERSION = 1 as const

export type OrcaState = 'connecting' | 'connected' | 'disconnected'

export type LinkError = { code: string; message: string; data?: unknown }

export type OrcaDescriptor = {
  appVersion?: string
  protocolVersion?: number
  hostPlatform?: string
  machineName?: string
}

/** First frame on every connection; the key is the only credential the hub checks. */
export type GatewayHello = {
  type: 'hello'
  v: typeof LINK_PROTOCOL_VERSION
  key: string
  gatewayId: string
  orcaState: OrcaState
  orca?: OrcaDescriptor
}

export type GatewayFrame =
  | GatewayHello
  | { type: 'request-result'; id: string; ok: true; result: unknown }
  | { type: 'request-result'; id: string; ok: false; error: LinkError }
  | { type: 'stream-frame'; id: string; result: unknown }
  | { type: 'stream-error'; id: string; error: LinkError }
  /** The stream ended or was re-subscribed; consumers must refetch rather than assume continuity. */
  | { type: 'stream-reset'; id: string }
  | { type: 'orca-state'; state: OrcaState; message?: string }
  /** Either side may probe; the peer must answer `pong` or be treated as dead. */
  | { type: 'ping' }
  | { type: 'pong' }

export type HubFrame =
  | { type: 'welcome'; gatewayId: string }
  | { type: 'request'; id: string; method: string; params?: unknown; timeoutMs?: number }
  | { type: 'subscribe'; id: string; method: string; params?: unknown }
  | { type: 'unsubscribe'; id: string }
  | { type: 'ping' }
  | { type: 'reject'; code: string; message: string }

export function isHubFrame(value: unknown): value is HubFrame {
  return isRecord(value) && typeof value.type === 'string'
}

export function isGatewayFrame(value: unknown): value is GatewayFrame {
  return isRecord(value) && typeof value.type === 'string'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
