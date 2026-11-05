// Browser <-> hub frames. Deliberately close to the gateway link protocol so the hub forwards
// without reshaping results; only ids and ownership are re-mapped.
import type { LinkError, OrcaDescriptor, OrcaState } from './link-protocol.ts'

export const WEB_PROTOCOL_VERSION = 1 as const

export type WebToHub =
  | { type: 'request'; id: string; method: string; params?: unknown; timeoutMs?: number }
  | { type: 'subscribe'; id: string; method: string; params?: unknown }
  | { type: 'unsubscribe'; id: string }
  | { type: 'ping' }

export type HubToWeb =
  | {
      type: 'welcome'
      v: typeof WEB_PROTOCOL_VERSION
      gatewayConnected: boolean
      orcaState: OrcaState | null
      orca?: OrcaDescriptor
    }
  | { type: 'request-result'; id: string; ok: true; result: unknown }
  | { type: 'request-result'; id: string; ok: false; error: LinkError }
  | { type: 'stream-frame'; id: string; result: unknown }
  | { type: 'stream-error'; id: string; error: LinkError }
  /** Refetch: the stream behind this id ended or was re-subscribed. */
  | { type: 'stream-reset'; id: string }
  | { type: 'gateway-state'; connected: boolean; orcaState: OrcaState | null; message?: string }
  | { type: 'pong' }

export function isWebFrame(value: unknown): value is WebToHub {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}
