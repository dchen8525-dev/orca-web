// Phase 0 contract check: prove the web gateway can read a live desktop Orca over E2EE v2.
// Read-only. Run: node scripts/phase0-smoke.ts
import { OrcaConnection } from '../src/gateway/orca/rpc-client.ts'
import { readAgentSessionHistory } from '../src/gateway/orca/agent-session.ts'
import { readLocalOrcaPairing } from './local-orca-pairing.ts'

type ProjectList = { projects: { id: string; displayName: string; sourceRepoIds?: string[] }[] }
type WorktreeRow = {
  worktreeId: string
  repoId: string
  path: string
  branch?: string
  status?: string
  workspaceStatus?: string
  displayName?: string
  lastActivityAt?: number
  agents?: {
    paneKey: string
    state: string
    agentType?: string
    conversationName?: string
    prompt?: string
    toolName?: string
    lastAssistantMessage?: string
    updatedAt?: number
    structuredHostOwned?: boolean
  }[]
}
type WorktreePs = { worktrees: WorktreeRow[]; totalCount?: number }
type StatusEvent = {
  type: string
  sessions?: { sessionId: string; status: string | null; conversationName?: string }[]
}

const pairing = readLocalOrcaPairing()
log(`endpoint      ${pairing.endpoint}`)
log(`paired device ${pairing.deviceName} (mobile scope)`)

const connection = await OrcaConnection.connect({
  endpoint: pairing.endpoint,
  deviceToken: pairing.deviceToken,
  hostPublicKeyB64: pairing.hostPublicKeyB64
})
log('handshake     ok (e2ee v2 + device token + client capabilities)')

try {
  const status = await connection.request<{
    appVersion?: string
    runtimeProtocolVersion?: number
    hostPlatform?: string
    deviceScope?: string
  }>('status.get')
  log(
    `status.get    ok  app=${status.appVersion} protocol=${status.runtimeProtocolVersion} ` +
      `platform=${status.hostPlatform} scope=${status.deviceScope}`
  )

  const projects = await connection.request<ProjectList>('project.list', {})
  const byRepo = new Map<string, string>()
  for (const project of projects.projects) {
    for (const repoId of project.sourceRepoIds ?? []) {
      byRepo.set(repoId, project.displayName)
    }
  }
  log(`project.list  ok  ${projects.projects.map((p) => p.displayName).join(', ')}`)

  const ps = await connection.request<WorktreePs>('worktree.ps', {})
  const tasks = ps.worktrees.flatMap((row) =>
    (row.agents ?? []).map((agent) => ({
      worktree: row,
      project: byRepo.get(row.repoId) ?? row.repoId,
      agent
    }))
  )
  log(`worktree.ps   ok  ${ps.worktrees.length} worktrees, ${tasks.length} agent tasks`)
  for (const task of tasks.slice(0, 10)) {
    log(
      `  - [${task.agent.state}] ${task.project} · ${task.worktree.displayName ?? task.worktree.branch} · ` +
        `${task.agent.conversationName ?? '(unnamed)'}${task.agent.toolName ? ` · ${task.agent.toolName}` : ''}`
    )
  }

  const sessionIdOf = (paneKey: string): string | null => {
    const match = /^structured-agent-session-(.+):[^:]+$/.exec(paneKey)
    return match ? match[1]! : null
  }
  const newest = [...tasks].sort(
    (left, right) => (right.agent.updatedAt ?? 0) - (left.agent.updatedAt ?? 0)
  )[0]
  const sessionId = newest ? sessionIdOf(newest.agent.paneKey) : null
  if (sessionId) {
    const history = await readAgentSessionHistory(connection, { sessionId, limit: 5 })
    const page = history.page
    log(
      `history       ok  ${page?.items.length ?? 0} items, fence=${page?.fence ?? '?'}, ` +
        `hasOlder=${page?.hasOlder ?? '?'}`
    )
  }

  // The first snapshot often arrives empty while the host seeds its roster; the next one is authoritative.
  const live = await statusFeedSnapshot(connection)
  log(`status feed   ok  ${live.sessions?.length ?? 0} projections (after ${live.attempts} snapshot(s))`)
} finally {
  connection.close()
}

async function statusFeedSnapshot(
  connection: OrcaConnection
): Promise<{ sessions?: StatusEvent['sessions']; attempts: number }> {
  return await new Promise((resolve, reject) => {
    let attempts = 0
    let handle: { close: () => void } | null = null
    const timer = setTimeout(() => {
      handle?.close()
      reject(new Error('No non-empty agentSession.subscribeStatus snapshot within 12s'))
    }, 12_000)
    void connection
      .subscribe('agentSession.subscribeStatus', {}, (frame) => {
        const event = frame as StatusEvent
        if (event?.type !== 'snapshot') {
          return
        }
        attempts++
        // An empty snapshot means "host not seeded yet", not "no tasks".
        if (!event.sessions?.length && attempts < 3) {
          return
        }
        clearTimeout(timer)
        handle?.close()
        resolve({ sessions: event.sessions, attempts })
      })
      .then((opened) => {
        handle = opened
      })
  })
}

function log(message: string): void {
  console.log(message)
}
