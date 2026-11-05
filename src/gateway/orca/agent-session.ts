// Agent-session reads and mutations over an authenticated Orca connection.
// Mutation envelopes mirror Orca's mobile client: same canonical fingerprint, same retry rules.
import { createHash, randomUUID } from 'node:crypto'
import type { OrcaConnection } from './rpc-client.ts'

export type MutationEnvelope = {
  sessionId: string
  clientOperationId: string
  /** null = the session must not exist yet (create). */
  expectedRuntimeFence: number | null
  payloadFingerprint: string
}

export type MutationRefusal = {
  code: string
  message?: string
  details?: unknown
}

export type MutationResult<TValue = unknown> =
  | { ok: true; value?: TValue; cursor?: unknown; fence?: number; replayed?: boolean }
  | { ok: false; refusal: MutationRefusal }

export type HistoryResult = {
  ok: boolean
  page?: {
    sessionId: string
    epoch: string
    fence?: number
    items: unknown[]
    submissions?: unknown[]
    hasOlder?: boolean
    hasNewer?: boolean
    liveCursor?: unknown
    backgroundTasks?: unknown
    latestTurn?: {
      itemId: string
      observedAt: number
      turn: { turnId: string; state: string; outcome?: string }
    } | null
  }
  reset?: string
  fence?: number
}

/** Orca's host recomputes this digest over the request it received; any drift is refused. */
export function agentSessionPayloadFingerprint(input: {
  method: string
  sessionId: string
  fields: Record<string, unknown>
}): string {
  const canonical = canonicalize({
    method: input.method,
    sessionId: input.sessionId,
    fields: input.fields
  })
  return createHash('sha256').update(canonical).digest('hex')
}

export function createOperationId(now: number = Date.now()): string {
  return `${Math.trunc(now)}-${randomUUID().replaceAll('-', '').toLowerCase()}`
}

export function createAgentSessionId(agent: string): string {
  return `${agent}_${randomUUID().replaceAll('-', '_')}`
}

export async function readAgentSessionHistory(
  connection: OrcaConnection,
  args: { sessionId: string; direction?: 'tail' | 'before' | 'after'; limit?: number; cursor?: unknown }
): Promise<HistoryResult> {
  return await connection.request<HistoryResult>('agentSession.history', {
    sessionId: args.sessionId,
    direction: args.direction ?? 'tail',
    ...(args.limit === undefined ? {} : { limit: args.limit }),
    ...(args.cursor === undefined ? {} : { cursor: args.cursor })
  })
}

/** Text-only user turn. The body shape is the provider-visible message Orca journals. */
export function userMessageBody(text: string): {
  kind: 'message'
  role: 'user'
  blocks: { type: 'text'; text: string }[]
} {
  return {
    kind: 'message',
    role: 'user',
    blocks: [{ type: 'text', text: text.trimEnd() }]
  }
}

export type SendMessageArgs = {
  sessionId: string
  fence: number
  text: string
  clientOperationId?: string
  /** Host-held draft while the agent is busy; gate on host support of queued messages. */
  delivery?: 'queue-if-active'
}

export async function sendAgentSessionMessage(
  connection: OrcaConnection,
  args: SendMessageArgs
): Promise<MutationResult> {
  const fields = {
    body: userMessageBody(args.text),
    ...(args.delivery ? { delivery: args.delivery } : {})
  }
  return await sendMutation(connection, 'agentSession.send', args.sessionId, args.fence, fields, {
    clientOperationId: args.clientOperationId
  })
}

export type CancelTurnArgs = {
  sessionId: string
  fence: number
  /** Names the turn to stop; omit to stop whatever the conversation has in flight. */
  turnId?: string
  prompt?: { itemId: string; expectedRevision: number }
}

export async function cancelAgentSessionTurn(
  connection: OrcaConnection,
  args: CancelTurnArgs
): Promise<MutationResult> {
  const fields = {
    ...(args.turnId ? { turnId: args.turnId } : {}),
    ...(args.prompt ? { prompt: args.prompt } : {})
  }
  return await sendMutation(connection, 'agentSession.cancel', args.sessionId, args.fence, fields)
}

export type CreateSessionArgs = {
  /** `worktree.ps` row id, sent as `id:<worktreeId>`. */
  worktreeId: string
  agent: 'claude' | 'codex' | string
  firstMessage?: string
  sessionId?: string
}

export type CreateSessionResult =
  | { ok: true; sessionId: string; fence: number | null }
  | { ok: false; refusal: MutationRefusal }

/**
 * Create is durable and retry-safe: replay the same envelope after an ambiguous transport
 * failure instead of minting a sibling session.
 */
export async function createAgentSession(
  connection: OrcaConnection,
  args: CreateSessionArgs
): Promise<CreateSessionResult> {
  const worktree = `id:${args.worktreeId}`
  const support = await connection.request<{ supported?: boolean; reason?: string } | null>(
    'agentSession.createSupport',
    { worktree, agent: args.agent }
  )
  if (!support || support.supported !== true) {
    return {
      ok: false,
      refusal: { code: 'structured_agent_session_unsupported', message: support?.reason }
    }
  }

  const sessionId = args.sessionId ?? createAgentSessionId(args.agent)
  const body = args.firstMessage ? userMessageBody(args.firstMessage) : undefined
  const params = structuredCreateParams({
    sessionId,
    worktree,
    agent: args.agent,
    firstMessage: body ? { clientMessageId: randomUUID(), body } : undefined
  })

  try {
    return interpretCreate(
      await connection.request<MutationResult>('agentSession.create', params, { timeoutMs: 15_000 }),
      sessionId
    )
  } catch {
    // One replay of the identical envelope: a lost ack must not leave two sessions behind.
    return interpretCreate(
      await connection.request<MutationResult>('agentSession.create', params, { timeoutMs: 15_000 }),
      sessionId
    )
  }
}

async function sendMutation(
  connection: OrcaConnection,
  method: 'agentSession.send' | 'agentSession.cancel',
  sessionId: string,
  fence: number,
  fields: Record<string, unknown>,
  options?: { clientOperationId?: string }
): Promise<MutationResult> {
  const envelope: MutationEnvelope = {
    sessionId,
    clientOperationId: options?.clientOperationId ?? createOperationId(),
    expectedRuntimeFence: fence,
    payloadFingerprint: agentSessionPayloadFingerprint({ method, sessionId, fields })
  }
  return await connection.request<MutationResult>(method, { envelope, ...fields })
}

export function isRefusal(result: unknown): result is { ok: false; refusal: MutationRefusal } {
  return (
    typeof result === 'object' &&
    result !== null &&
    (result as { ok?: unknown }).ok === false &&
    typeof (result as { refusal?: unknown }).refusal === 'object'
  )
}

function interpretCreate(result: MutationResult, sessionId: string): CreateSessionResult {
  return isRefusal(result)
    ? { ok: false, refusal: result.refusal }
    : {
        ok: true,
        sessionId,
        fence: typeof (result as { fence?: unknown }).fence === 'number'
          ? (result as { fence: number }).fence
          : null
      }
}

function structuredCreateParams(args: {
  sessionId: string
  worktree: string
  agent: string
  firstMessage?: { clientMessageId: string; body: unknown }
}): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    worktree: args.worktree,
    agent: args.agent,
    ...(args.firstMessage ? { firstMessage: args.firstMessage } : {})
  }
  return {
    envelope: {
      sessionId: args.sessionId,
      clientOperationId: createOperationId(),
      expectedRuntimeFence: null,
      payloadFingerprint: agentSessionPayloadFingerprint({
        method: 'agentSession.create',
        sessionId: args.sessionId,
        fields
      })
    },
    ...fields
  }
}

// Sorted keys, undefined omitted: both peers must hash the same bytes.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value ?? null)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`).join(',')}}`
}
