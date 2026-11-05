import { useCallback, useEffect, useMemo, useState } from 'react'
import type { HubClient, HubStatus } from './hub'
import { CreateTask } from './CreateTask'
import {
  sessionIdFromPaneKey,
  type Project,
  type Projection,
  type StatusEvent,
  type WorktreePs,
  type WorktreeRow
} from './types'

type TaskTarget = { sessionId: string; title: string; agent?: string }
type Filter = 'all' | 'working' | 'attention'

type BoardTask = {
  key: string
  sessionId: string
  title: string
  detail: string
  state: string
  updatedAt?: number
  agent?: string
  target: TaskTarget
}

type BoardWorktree = {
  worktree: WorktreeRow
  label: string
  branch: string
  tasks: BoardTask[]
}

type BoardGroup = { name: string; worktrees: BoardWorktree[] }

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'working', label: '进行中' },
  { key: 'attention', label: '待确认' }
]

export function Board({
  hub,
  status,
  onOpenTask,
  onSignOut
}: {
  hub: HubClient
  status: HubStatus
  onOpenTask: (task: TaskTarget) => void
  onSignOut: () => Promise<void>
}) {
  const [projects, setProjects] = useState<Project[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeRow[]>([])
  const [projections, setProjections] = useState<Map<string, Projection>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingIn, setCreatingIn] = useState<WorktreeRow | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) {
        setLoading(true)
      }
      try {
        const [projectList, ps] = await Promise.all([
          hub.request<{ projects: Project[] }>('project.list', {}),
          hub.request<WorktreePs>('worktree.ps', {})
        ])
        setProjects(projectList.projects)
        setWorktrees(ps.worktrees)
        setError(null)
      } catch (failure) {
        if (!quiet) {
          setError((failure as Error).message)
        }
      } finally {
        if (!quiet) {
          setLoading(false)
        }
      }
    },
    [hub]
  )

  useEffect(() => {
    if (status.gatewayConnected) {
      void load()
    }
  }, [status.gatewayConnected, load])

  // worktree.ps is authoritative: poll it so a task that starts (or ends) while the
  // status feed is quiet still shows up without a manual refresh.
  useEffect(() => {
    if (!status.gatewayConnected) {
      return
    }
    const timer = setInterval(() => void load(true), 15_000)
    return () => clearInterval(timer)
  }, [status.gatewayConnected, load])

  // Statuses describe a live socket; once it is gone they are history, not state.
  useEffect(() => {
    if (!status.gatewayConnected) {
      setProjections(new Map())
    }
  }, [status.gatewayConnected])

  useEffect(() => {
    if (!status.gatewayConnected) {
      return
    }
    return hub.subscribe('agentSession.subscribeStatus', {}, (event) => {
      if (event.kind === 'reset') {
        setProjections(new Map())
        void load(true)
        return
      }
      if (event.kind === 'error') {
        return
      }
      const frame = event.result as StatusEvent
      if (frame.type === 'snapshot') {
        // An empty opening snapshot means "not seeded yet", not "no tasks".
        if (frame.sessions.length === 0) {
          return
        }
        setProjections(new Map(frame.sessions.map((session) => [session.sessionId, session])))
      } else if (frame.type === 'status') {
        setProjections((previous) => {
          const next = new Map(previous)
          next.set(frame.session.sessionId, frame.session)
          return next
        })
      }
    })
  }, [hub, status.gatewayConnected, load])

  const groups = useMemo<BoardGroup[]>(() => {
    const projectByRepo = new Map<string, string>()
    for (const project of projects) {
      for (const repoId of project.sourceRepoIds ?? []) {
        projectByRepo.set(repoId, project.displayName)
      }
    }
    const grouped = new Map<string, BoardWorktree[]>()
    for (const worktree of worktrees) {
      const name = projectByRepo.get(worktree.repoId) ?? '其他'
      const branch = worktree.branch?.replace('refs/heads/', '') ?? ''
      const label = worktree.displayName ?? branch ?? worktree.path
      const tasks: BoardTask[] = []
      for (const agent of worktree.agents ?? []) {
        const sessionId = sessionIdFromPaneKey(agent.paneKey)
        if (!sessionId) {
          continue
        }
        const projection = projections.get(sessionId)
        const state = projection?.status ?? (agent.state === 'working' ? 'working' : 'idle')
        const title =
          projection?.conversationName ?? agent.conversationName ?? agent.prompt ?? '未命名任务'
        const detail = projection?.toolName
          ? `正在 ${projection.toolName}`
          : firstLine(agent.lastAssistantMessage ?? agent.prompt ?? '')
        tasks.push({
          key: agent.paneKey,
          sessionId,
          title,
          detail,
          state,
          updatedAt: projection?.updatedAt ?? agent.updatedAt,
          agent: agent.agentType,
          target: { sessionId, title, agent: agent.agentType }
        })
      }
      const rows = grouped.get(name) ?? []
      rows.push({ worktree, label, branch, tasks })
      grouped.set(name, rows)
    }
    return [...grouped].map(([name, rows]) => ({ name, worktrees: rows }))
  }, [projects, worktrees, projections])

  const counts = useMemo(() => {
    const all = groups.flatMap((group) => group.worktrees.flatMap((row) => row.tasks))
    return {
      all: all.length,
      working: all.filter((task) => task.state === 'working').length,
      attention: all.filter((task) => task.state === 'attention').length
    }
  }, [groups])

  const visible = useMemo(() => {
    // Project numbers stay tied to the unfiltered order, so they do not shuffle per filter.
    const indexed = groups.map((group, index) => ({ ...group, index }))
    if (filter === 'all') {
      return indexed
    }
    return indexed
      .map((group) => ({
        ...group,
        worktrees: group.worktrees
          .map((row) => ({ ...row, tasks: row.tasks.filter((task) => task.state === filter) }))
          .filter((row) => row.tasks.length > 0)
      }))
      .filter((group) => group.worktrees.length > 0)
  }, [groups, filter])

  const agentCandidates = useMemo(() => {
    const seen = new Set(['claude', 'codex'])
    for (const worktree of worktrees) {
      for (const agent of worktree.agents ?? []) {
        if (agent.agentType) {
          seen.add(agent.agentType)
        }
      }
    }
    return [...seen]
  }, [worktrees])

  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

  return (
    <div className="app">
      <header className="masthead">
        <div className="kicker">
          <span className={`dot dot-${connectionTone(status)}`} />
          <span>{`orca · ${connectionLabel(status)}`}</span>
          <span className="right">{today}</span>
        </div>
        <div className="title-row">
          <h1>
            进行中的<em>工作</em>
          </h1>
          <div className="mast-actions">
            <button onClick={() => void load(false)} disabled={!status.gatewayConnected || loading}>
              刷新
            </button>
            <button onClick={() => void onSignOut()}>退出</button>
          </div>
        </div>
        <p className="dek">
          {counts.working} 个任务正在跑，{counts.attention} 个等你回话。
        </p>
      </header>

      <div className="rule double mast-rule" />

      <nav className="filters">
        {FILTERS.map((entry) => (
          <button
            key={entry.key}
            className={filter === entry.key ? 'on' : ''}
            onClick={() => setFilter(entry.key)}
            aria-pressed={filter === entry.key}
          >
            {entry.label}
            <b>{counts[entry.key]}</b>
          </button>
        ))}
      </nav>

      <main className="board">
        {!status.gatewayConnected ? (
          <p className="empty">家里电脑的 gateway 未连接。Orca 是否还开着？</p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        {loading && worktrees.length === 0 ? <p className="empty">载入中…</p> : null}

        {visible.map((group) => (
          <section key={group.name} className="project">
            <div className="project-head">
              <span className="no">{String(group.index + 1).padStart(2, '0')}</span>
              <h2>{group.name}</h2>
              <span className="count">
                {group.worktrees.reduce((sum, row) => sum + row.tasks.length, 0)} 条
              </span>
            </div>
            {group.worktrees.map((row) => (
              <div key={row.worktree.worktreeId}>
                <div className="worktree-line">
                  <span>⑂</span>
                  <span className="branch">{row.branch || row.label}</span>
                  <button className="new" onClick={() => setCreatingIn(row.worktree)}>
                    新建
                  </button>
                </div>
                {row.tasks.length === 0 ? (
                  <p className="worktree-no-tasks">这里还没有任务。</p>
                ) : null}
                {row.tasks.map((task) => (
                  <button
                    key={task.key}
                    className={`task task-${task.state}`}
                    onClick={() => onOpenTask(task.target)}
                  >
                    <span className="task-head">
                      <span className="task-mark">{markForState(task.state)}</span>
                      <span className="task-body">
                        <span className="task-title">{task.title}</span>
                      </span>
                    </span>
                    {task.detail ? <span className="task-detail">{task.detail}</span> : null}
                    <span className="task-foot">
                      <span className="state">{stateLabel(task.state)}</span>
                      <span className="sep">/</span>
                      <span>{task.agent ?? 'agent'}</span>
                      {task.updatedAt ? (
                        <span className="time">{relativeTime(task.updatedAt)}</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </section>
        ))}

        {status.gatewayConnected && worktrees.length > 0 && visible.length === 0 ? (
          <p className="empty">这一栏暂时是空的。</p>
        ) : null}
        {!loading && status.gatewayConnected && worktrees.length === 0 ? (
          <p className="empty">没有工作区</p>
        ) : null}
      </main>

      {creatingIn ? (
        <CreateTask
          hub={hub}
          worktree={creatingIn}
          candidates={agentCandidates}
          onClose={() => setCreatingIn(null)}
          onCreated={(task) => {
            setCreatingIn(null)
            onOpenTask(task)
          }}
        />
      ) : null}
    </div>
  )
}

function markForState(state: string): string {
  if (state === 'working') {
    return '●'
  }
  if (state === 'attention') {
    return '!'
  }
  return '·'
}

function firstLine(value: string): string {
  const line = plainText(value).slice(0, 120)
  return line ? `${line}${line.length >= 120 ? '…' : ''}` : ''
}

// The board shows one readable line, not the agent's markdown source.
function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\s)>\s?/g, '$1')
    .replace(/(^|\s)[-*+]\s+/g, '$1')
    .replace(/(^|\s)\d+[.)]\s+/g, '$1')
    .replace(/`+/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stateLabel(state: string | null | undefined): string {
  switch (state) {
    case 'working':
      return '进行中'
    case 'attention':
      return '待确认'
    case 'idle':
      return '空闲'
    default:
      return '未知'
  }
}

export function toneForState(state: string | null | undefined): 'green' | 'amber' | 'grey' {
  if (state === 'working') {
    return 'green'
  }
  if (state === 'attention') {
    return 'amber'
  }
  return 'grey'
}

function connectionTone(status: HubStatus): 'green' | 'amber' | 'red' {
  if (!status.connected) {
    return 'red'
  }
  if (!status.gatewayConnected) {
    return 'amber'
  }
  return status.orcaState === 'connected' ? 'green' : 'amber'
}

function connectionLabel(status: HubStatus): string {
  if (!status.connected) {
    return '正在连接服务器…'
  }
  if (!status.gatewayConnected) {
    return '家里电脑未连接'
  }
  switch (status.orcaState) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return 'Orca 连接中'
    case 'disconnected':
      return 'Orca 已断开'
    default:
      return '已连接'
  }
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) {
    return '刚刚'
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} 分钟前`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} 小时前`
  }
  return `${Math.round(hours / 24)} 天前`
}
