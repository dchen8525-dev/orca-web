// Proves the mutation envelope is accepted and fingerprint-checked without touching a conversation:
// a deliberately wrong digest must be refused before any effect. Read-only on the transcript.
import { OrcaConnection } from '../src/gateway/orca/rpc-client.ts'
import {
  agentSessionPayloadFingerprint,
  createOperationId,
  readAgentSessionHistory,
  userMessageBody
} from '../src/gateway/orca/agent-session.ts'
import { readLocalOrcaPairing } from './local-orca-pairing.ts'

type WorktreePs = { worktrees: { agents?: { paneKey: string; state: string }[] }[] }

const pairing = readLocalOrcaPairing()
const connection = await OrcaConnection.connect({
  endpoint: pairing.endpoint,
  deviceToken: pairing.deviceToken,
  hostPublicKeyB64: pairing.hostPublicKeyB64
})

try {
  const ps = await connection.request<WorktreePs>('worktree.ps', {})
  const paneKey = ps.worktrees
    .flatMap((row) => row.agents ?? [])
    .map((agent) => agent.paneKey)
    .find((key) => key.startsWith('structured-agent-session-'))
  const sessionId = paneKey ? /^structured-agent-session-(.+):[^:]+$/.exec(paneKey)?.[1] : undefined
  if (!sessionId) {
    throw new Error('No structured agent session to test the envelope against')
  }

  const history = await readAgentSessionHistory(connection, { sessionId, limit: 1 })
  const fence = history.page?.fence
  if (!fence) {
    throw new Error('Host did not expose a fence; cannot build a mutation envelope')
  }

  const body = userMessageBody('phase0 envelope probe')
  const result = await connection.request<unknown>('agentSession.send', {
    envelope: {
      sessionId,
      clientOperationId: createOperationId(),
      expectedRuntimeFence: fence,
      payloadFingerprint: '0'.repeat(64)
    },
    body
  })

  const refusal = (result as { refusal?: { code?: string; details?: { reason?: string } } }).refusal
  const pass =
    refusal?.code === 'agent_session_operation_conflict' &&
    refusal.details?.reason === 'fingerprintMismatch'
  console.log(`session       ${sessionId} (fence ${fence})`)
  console.log(`refusal       ${refusal?.code ?? 'none'} / ${refusal?.details?.reason ?? '-'}`)
  console.log(
    `fingerprint   ${agentSessionPayloadFingerprint({
      method: 'agentSession.send',
      sessionId,
      fields: { body }
    })}`
  )
  console.log(pass ? 'PASS envelope + fingerprint reached the host' : 'FAIL unexpected answer')
  if (!pass) {
    process.exitCode = 1
  }
} finally {
  connection.close()
}
