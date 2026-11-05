// Phase 0 write path: create a throwaway chat, send one turn, stop it, close it.
// This touches the live desktop app on purpose; run only with the user's go-ahead.
import { OrcaConnection } from '../src/gateway/orca/rpc-client.ts'
import {
  cancelAgentSessionTurn,
  createAgentSession,
  readAgentSessionHistory,
  sendAgentSessionMessage,
  type MutationResult
} from '../src/gateway/orca/agent-session.ts'
import { readLocalOrcaPairing } from './local-orca-pairing.ts'

type WorktreePs = { worktrees: { worktreeId: string; path: string }[] }

const pairing = readLocalOrcaPairing()
const connection = await OrcaConnection.connect({
  endpoint: pairing.endpoint,
  deviceToken: pairing.deviceToken,
  hostPublicKeyB64: pairing.hostPublicKeyB64
})

let createdSessionId: string | null = null

try {
  const ps = await connection.request<WorktreePs>('worktree.ps', {})
  const worktree = ps.worktrees.find((row) => row.path.toLowerCase().endsWith('/orca'))
  if (!worktree) {
    throw new Error('No D:/work/orca worktree row; refusing to guess one')
  }
  console.log(`worktree      ${worktree.path}`)

  const created = await createAgentSession(connection, {
    worktreeId: worktree.worktreeId,
    agent: 'claude'
  })
  if (!created.ok) {
    throw new Error(`create refused: ${created.refusal.code} ${created.refusal.message ?? ''}`)
  }
  createdSessionId = created.sessionId
  console.log(`create        ok  ${created.sessionId} fence=${created.fence ?? '?'}`)

  const history = await readAgentSessionHistory(connection, { sessionId: created.sessionId, limit: 1 })
  let fence = created.fence ?? history.page?.fence ?? null
  if (fence === null) {
    throw new Error('create returned no fence')
  }
  console.log(`history       ok  fence=${fence} items=${history.page?.items.length ?? 0}`)

  const sent = await sendAgentSessionMessage(connection, {
    sessionId: created.sessionId,
    fence,
    text: 'Reply with exactly: ok'
  })
  console.log(`send          ${describe(sent)}`)
  if (sent.ok && typeof sent.fence === 'number') {
    fence = sent.fence
  }

  // Let the provider open a turn so Stop names a real one.
  const running = await waitForRunningTurn(created.sessionId, fence, 12_000)
  fence = running.fence
  console.log(`running turn  ${running.turnId ?? '(none observed; provider may have finished)'}`)

  const cancelled = await cancelAgentSessionTurn(connection, {
    sessionId: created.sessionId,
    fence,
    ...(running.turnId ? { turnId: running.turnId } : {})
  })
  console.log(`cancel        ${describe(cancelled)}`)

  const closed = await connection.request<{ ok?: boolean }>('agentSession.close', {
    sessionId: created.sessionId
  })
  console.log(`close         ${JSON.stringify(closed)}`)
  createdSessionId = null
} finally {
  if (createdSessionId) {
    try {
      await connection.request('agentSession.close', { sessionId: createdSessionId })
      console.log(`close         ok (cleanup)`)
    } catch (error) {
      console.log(`close         failed (cleanup): ${(error as Error).message}`)
    }
  }
  connection.close()
}

async function waitForRunningTurn(
  sessionId: string,
  fallbackFence: number,
  timeoutMs: number
): Promise<{ turnId: string | null; fence: number }> {
  const deadline = Date.now() + timeoutMs
  let fence = fallbackFence
  while (Date.now() < deadline) {
    const history = await readAgentSessionHistory(connection, { sessionId, limit: 1 })
    if (typeof history.page?.fence === 'number') {
      fence = history.page.fence
    }
    const turn = history.page?.latestTurn?.turn
    if (turn?.state === 'running') {
      return { turnId: turn.turnId, fence }
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  return { turnId: null, fence }
}

function describe(result: MutationResult): string {
  if (result.ok) {
    const replayed = (result as { replayed?: boolean }).replayed ? ' replayed' : ''
    return `ok${replayed} fence=${(result as { fence?: number }).fence ?? '?'}`
  }
  return `refused ${result.refusal.code}${result.refusal.message ? ` — ${result.refusal.message}` : ''}`
}
