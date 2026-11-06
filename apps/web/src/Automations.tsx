// Scheduled-task management: Orca owns every automation (rrule, missed-run grace, runs),
// so this page only surfaces the automation.* RPC surface and keeps screen-local state.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { HubClient } from './hub'
import { sessionIdFromPaneKey, type Automation, type AutomationRun, type Project, type WorktreeRow } from './types'

type SchedulePreset = 'hourly' | 'minutes' | 'daily' | 'weekdays' | 'weekly' | 'cron'

const PRESETS: { key: SchedulePreset; label: string }[] = [
  { key: 'daily', label: '每天' },
  { key: 'weekdays', label: '工作日' },
  { key: 'weekly', label: '每周' },
  { key: 'hourly', label: '每小时' },
  { key: 'minutes', label: '每几分钟' },
  { key: 'cron', label: '自定义 cron' }
]

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const RUN_STATUS: Record<string, string> = {
  pending: '等待',
  dispatching: '启动中',
  dispatched: '已启动',
  completed: '已完成',
  failed: '失败'
}

export function Automations({
  hub,
  connected,
  onBack,
  onOpenTask
}: {
  hub: HubClient
  connected: boolean
  onBack: () => void
  onOpenTask: (sessionId: string, title: string) => void
}) {
  const [automations, setAutomations] = useState<Automation[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [worktrees, setWorktrees] = useState<WorktreeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const busyRef = useRef<string | null>(null)
  const [runsFor, setRunsFor] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [editor, setEditor] = useState<Automation | null | undefined>(undefined)

  const load = async () => {
    try {
      const [list, projectList, ps] = await Promise.all([
        hub.request<{ automations: Automation[] }>('automation.list', {}),
        hub.request<{ projects: Project[] }>('project.list', {}),
        hub.request<{ worktrees: WorktreeRow[] }>('worktree.ps', {})
      ])
      setAutomations(list.automations)
      setProjects(projectList.projects)
      setWorktrees(ps.worktrees)
      setError(null)
      setStale(false)
      setNote(null)
    } catch (failure) {
      setError((failure as Error).message)
      setStale(true)
      // The error line replaces the loader; "载入中…" must not linger forever.
      setAutomations((current) => current ?? [])
    }
  }

  useEffect(() => {
    if (connected) {
      void load()
    }
  }, [connected]) // eslint-disable-line react-hooks/exhaustive-deps

  const mutate = async (id: string, action: () => Promise<unknown>, remove = false) => {
    // A double tap must not start two runs; busyId only paints the button.
    if (busyRef.current) {
      return
    }
    busyRef.current = id
    setBusyId(id)
    setNote(null)
    try {
      await action()
      await load()
      if (remove) {
        setRunsFor(null)
        setConfirming(null)
      } else if (runsFor === id) {
        // The automation may vanish between click and refetch; its history is then gone too.
        try {
          setRuns(
            (await hub.request<{ runs: AutomationRun[] }>('automation.runs', { automationId: id })).runs
          )
        } catch {
          setRunsFor(null)
        }
      }
    } catch (failure) {
      setNote((failure as Error).message)
    } finally {
      busyRef.current = null
      setBusyId(null)
    }
  }

  const toggleRuns = async (id: string) => {
    if (busyRef.current) {
      return
    }
    if (runsFor === id) {
      setRunsFor(null)
      return
    }
    busyRef.current = id
    setBusyId(id)
    try {
      setRuns((await hub.request<{ runs: AutomationRun[] }>('automation.runs', { automationId: id })).runs)
      setRunsFor(id)
    } catch (failure) {
      setNote((failure as Error).message)
    } finally {
      busyRef.current = null
      setBusyId(null)
    }
  }

  const openRun = (run: AutomationRun) => {
    const sessionId = runSessionId(run)
    if (sessionId) {
      onBack()
      onOpenTask(sessionId, run.title)
    }
  }

  const agentOptions = useMemo(() => {
    // worktree.ps only names agents that have run at least once here
    const seen = new Set(['claude', 'codex', 'gemini', 'grok', 'copilot'])
    for (const row of worktrees) {
      for (const agent of row.agents ?? []) {
        if (agent.agentType && isTuiLike(agent.agentType)) {
          seen.add(agent.agentType)
        }
      }
    }
    return [...seen]
  }, [worktrees])

  const repoById = useMemo(() => {
    const names = new Map<string, string>()
    for (const project of projects) {
      for (const repoId of project.sourceRepoIds ?? []) {
        names.set(repoId, project.displayName)
      }
    }
    return names
  }, [projects])

  return (
    <div className="task-view">
      <div className="topnav">
        <button className="back" onClick={onBack}>
          返回
        </button>
        <span className="sheet-title">定时任务</span>
        <button className="primary" disabled={!connected} onClick={() => setEditor(null)}>
          新建
        </button>
      </div>
      <div className="rule" />
      <main className="article">
        {connected ? null : <p className="empty">家里电脑的 gateway 未连接。</p>}
        {error ? (
          <p className="error">
            {stale ? `${error}（以下是上次成功载入的内容）` : error}
          </p>
        ) : null}
        {note ? <p className="error">{note}</p> : null}
        {automations === null && connected ? <p className="empty">载入中…</p> : null}
        {automations?.length === 0 && !error ? (
          <p className="empty">
            还没有定时任务。到点由家里桌面执行；Orca 没开时错过的任务会在宽限期内补跑一次。
          </p>
        ) : null}
        {(automations ?? []).map((automation) => (
          <section className="autom" key={automation.id}>
            <div className="autom-head">
              <span className="task-mark">{automation.enabled ? '✳' : '·'}</span>
              <h3 className="autom-title">{automation.name}</h3>
              <span className={`pill${automation.enabled ? ' pill-green' : ' pill-amber'}`}>
                {automation.enabled ? '已启用' : '已暂停'}
              </span>
            </div>
            <p className="autom-meta">
              {automation.agentId} · {describeRrule(automation.rrule)}
              {automation.timezone ? ` · ${automation.timezone}` : ''}
              {automation.nextRunAt
                ? ` · 下次 ${fmtStamp(automation.nextRunAt, automation.timezone)}`
                : ''}
            </p>
            <p className="autom-prompt">{automation.prompt}</p>
            <div className="autom-actions">
              <button
                disabled={busyId === automation.id}
                onClick={() => void mutate(automation.id, () => hub.request('automation.runNow', { id: automation.id }))}
              >
                运行一次
              </button>
              <button
                disabled={busyId === automation.id}
                onClick={() =>
                  void mutate(automation.id, () =>
                    hub.request('automation.update', {
                      id: automation.id,
                      updates: { enabled: !automation.enabled }
                    })
                  )
                }
              >
                {automation.enabled ? '暂停' : '启用'}
              </button>
              <button disabled={busyId === automation.id} onClick={() => void toggleRuns(automation.id)}>
                运行记录
              </button>
              <button onClick={() => setEditor(automation)}>编辑</button>
              {confirming === automation.id ? (
                <>
                  <button
                    className="autom-danger"
                    disabled={busyId === automation.id}
                    onClick={() =>
                      void mutate(
                        automation.id,
                        () => hub.request('automation.delete', { id: automation.id }),
                        true
                      )
                    }
                  >
                    确认删除
                  </button>
                  <button onClick={() => setConfirming(null)}>取消</button>
                </>
              ) : (
                <button className="autom-danger" onClick={() => setConfirming(automation.id)}>
                  删除
                </button>
              )}
            </div>
            {runsFor === automation.id ? (
              <div className="autom-runs">
                {runs.length === 0 ? <p className="muted small">还没有运行记录。</p> : null}
                {runs.map((run) => {
                  const linked = canOpenRun(run)
                  const body = (
                    <>
                      <span className="run-status">{runStatus(run)}</span>
                      <span className="run-title">
                        {fmtStamp(run.scheduledFor, null)}
                        {run.trigger === 'manual' ? ' · 手动' : ''}
                        {run.error ? ` · ${run.error}` : ''}
                      </span>
                      <span className="run-open">{linked ? '查看 ›' : ''}</span>
                    </>
                  )
                  return linked ? (
                    <button className="run-row" key={run.id} onClick={() => openRun(run)}>
                      {body}
                    </button>
                  ) : (
                    <div className="run-row" key={run.id}>
                      {body}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </section>
        ))}
        <p className="footnote">调度和补跑都由桌面 Orca 负责；这页只是它的遥控器。</p>
      </main>
      {editor !== undefined ? (
        <AutomationEditor
          hub={hub}
          worktrees={worktrees}
          repoName={repoById}
          editing={editor}
          agents={agentOptions}
          onClose={() => setEditor(undefined)}
          onSaved={async () => {
            setEditor(undefined)
            await load()
          }}
        />
      ) : null}
    </div>
  )
}

function AutomationEditor({
  hub,
  worktrees,
  repoName,
  editing,
  agents,
  onClose,
  onSaved
}: {
  hub: HubClient
  worktrees: WorktreeRow[]
  repoName: Map<string, string>
  editing: Automation | null
  agents: string[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const managed = worktrees.filter((row) => Boolean(row.worktreeId))
  const repoOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of worktrees) {
      if (!seen.has(row.repoId)) {
        seen.set(row.repoId, repoName.get(row.repoId) ?? row.repoId)
      }
    }
    return [...seen]
  }, [worktrees, repoName])

  const [name, setName] = useState(editing?.name ?? '')
  const [prompt, setPrompt] = useState(editing?.prompt ?? '')
  const [agent, setAgent] = useState(editing?.agentId ?? (agents.includes('claude') ? 'claude' : agents[0] ?? null))
  const [preset, setPreset] = useState<SchedulePreset>(
    editing ? presetOf(editing.rrule) : 'daily'
  )
  const [time, setTime] = useState(editing ? clockFromRrule(editing.rrule) : '09:30')
  const [weekday, setWeekday] = useState(editing ? dayFromRrule(editing.rrule) : 1)
  const [minutes, setMinutes] = useState(editing ? intervalFromRrule(editing.rrule) : 30)
  const [cron, setCron] = useState(editing?.rrule ?? '0 9 * * *')
  const [mode, setMode] = useState<'existing' | 'new_per_run'>(
    editing?.workspaceMode === 'new_per_run' ? 'new_per_run' : 'existing'
  )
  const [workspace, setWorkspace] = useState(editing?.workspaceId ?? managed[0]?.worktreeId ?? null)
  const [repo, setRepo] = useState(repoOptions[0]?.[0] ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The sheet can open before its selector lists arrive; falling back keeps the first
  // worktree selected instead of saving "no workspace chosen".
  const activeWorkspace = workspace ?? managed[0]?.worktreeId ?? null
  const activeRepo = repo ?? repoOptions[0]?.[0] ?? null

  const editingWorkspace = useMemo(() => {
    if (!editing) {
      return null
    }
    return managed.find((row) => row.worktreeId === editing.workspaceId) ?? null
  }, [editing, managed])

  const save = async () => {
    if (busy) {
      return
    }
    if (!agent) {
      setError('选择一个 agent')
      return
    }
    const rrule = buildRrule({ preset, time, weekday, minutes, cron })
    if (!rrule) {
      setError('时间表没有可运行的时刻，请调整')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing) {
        await hub.request('automation.update', {
          id: editing.id,
          updates: { name: name.trim() || editing.name, agentId: agent, prompt: prompt.trim(), rrule }
        })
      } else {
        const selector =
          mode === 'existing'
            ? activeWorkspace
              ? { workspace: `id:${activeWorkspace}` }
              : null
            : activeRepo
              ? { repo: `id:${activeRepo}` }
              : null
        if (!selector) {
          setError(mode === 'existing' ? '选择一个工作区' : '选择一个项目')
          setBusy(false)
          return
        }
        await hub.request('automation.create', {
          name: name.trim() || '定时任务',
          prompt: prompt.trim(),
          agentId: agent,
          rrule,
          dtstart: Date.now() + 5 * 60_000,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Shanghai',
          enabled: true,
          ...selector
        })
      }
      await onSaved()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet">
      <div className="topnav">
        <button className="back" onClick={onClose}>
          取消
        </button>
        <span className="sheet-title">{editing ? '编辑定时' : '新建定时'}</span>
        <button className="primary" onClick={() => void save()} disabled={busy}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
      <div className="rule" />
      <div className="sheet-body">
        {editing ? (
          <p className="sheet-context">
            {editingWorkspace
              ? `_workspace ${repoName.get(editingWorkspace.repoId) ?? ''} / ${editingWorkspace.displayName ?? editingWorkspace.branch ?? editingWorkspace.path}`
              : editing.workspaceMode === 'new_per_run'
                ? '每次运行新建工作区'
                : '固定工作区（未在列表中找到）'}
          </p>
        ) : null}

        <p className="field-label">名称</p>
        <input className="inline-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="每日站前简报" />

        <p className="field-label">任务内容</p>
        <textarea
          className="sheet-textarea"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="到点要把这项提示交给 agent 执行……"
        />

        <p className="field-label">Agent</p>
        <div className="chips">
          {agents.map((name) => (
            <button key={name} className={`chip${name === agent ? ' chip-active' : ''}`} onClick={() => setAgent(name)}>
              {name}
            </button>
          ))}
        </div>

        <p className="field-label">时间表</p>
        <div className="chips">
          {PRESETS.map((entry) => (
            <button key={entry.key} className={`chip${entry.key === preset ? ' chip-active' : ''}`} onClick={() => setPreset(entry.key)}>
              {entry.label}
            </button>
          ))}
        </div>
        <div className="schedule-inputs">
          {(preset === 'daily' || preset === 'weekdays' || preset === 'weekly') && (
            <div className="schedule-controls">
              {preset === 'weekly' ? (
                <select className="inline-select" value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
                  {WEEKDAYS.map((label, index) => (
                    <option key={index} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              <input type="time" className="inline-input" value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
          )}
          {preset === 'minutes' ? (
            <div className="schedule-controls">
              <input
                type="number"
                min={1}
                max={59}
                className="inline-input"
                value={minutes}
                onChange={(event) => setMinutes(Number(event.target.value))}
              />
              <span className="muted small">分钟</span>
            </div>
          ) : null}
          {preset === 'hourly' ? (
            <div className="schedule-controls">
              <input
                type="number"
                min={0}
                max={59}
                className="inline-input"
                value={Number(time.split(':')[1] ?? 0)}
                onChange={(event) => setTime(`00:${event.target.value.padStart(2, '0')}`)}
              />
              <span className="muted small">每小时第 N 分钟</span>
            </div>
          ) : null}
          {preset === 'cron' ? <input className="inline-input" value={cron} onChange={(event) => setCron(event.target.value)} placeholder="0 9 * * *" /> : null}
        </div>

        {editing ? (
          <p className="field-label">工作区（不可改，需删除重建）</p>
        ) : (
          <p className="field-label">工作区</p>
        )}
        {editing ? (
          <p className="muted small">
            {editingWorkspace
              ? `${repoName.get(editingWorkspace.repoId) ?? ''} / ${editingWorkspace.displayName ?? editingWorkspace.branch ?? editingWorkspace.path}`
              : editing.workspaceMode === 'new_per_run'
                ? '每次运行新建工作区'
                : editing.workspaceId ?? '—'}
          </p>
        ) : (
          <>
            <div className="chips">
              <button className={`chip${mode === 'existing' ? ' chip-active' : ''}`} onClick={() => setMode('existing')}>
                沿用现有工作区
              </button>
              <button className={`chip${mode === 'new_per_run' ? ' chip-active' : ''}`} onClick={() => setMode('new_per_run')}>
                每次新建工作区
              </button>
            </div>
            {mode === 'existing' ? (
              <div className="ws-options">
                {managed.map((row) => (
                  <label className="ws-option" key={row.worktreeId}>
                    <input
                      type="radio"
                      name="automation-workspace"
                      checked={activeWorkspace === row.worktreeId}
                      onChange={() => setWorkspace(row.worktreeId)}
                    />
                    <span>
                      {repoName.get(row.repoId) ?? '其他'} <em>/</em> {row.displayName ?? row.branch ?? row.path}
                    </span>
                  </label>
                ))}
                {managed.length === 0 ? <p className="muted small">没有可用的工作区，改成"每次新建"试试。</p> : null}
              </div>
            ) : (
              <div className="ws-options">
                {repoOptions.map(([id, label]) => (
                  <label className="ws-option" key={id}>
                    <input type="radio" name="automation-repo" checked={activeRepo === id} onChange={() => setRepo(id)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  )
}

function isTuiLike(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name)
}

/**
 * Runs launch terminals, not structured sessions: a terminalPaneKey without the
 * structured prefix names no session TaskView can load, so the row stays unlinked.
 */
function runSessionId(run: AutomationRun): string | null {
  if (run.chatSessionId) {
    return run.chatSessionId
  }
  if (!run.terminalPaneKey) {
    return null
  }
  return sessionIdFromPaneKey(run.terminalPaneKey)
}

function canOpenRun(run: AutomationRun): boolean {
  return runSessionId(run) !== null
}

function runStatus(run: AutomationRun): string {
  if (run.status.startsWith('skipped')) {
    return '跳过'
  }
  return RUN_STATUS[run.status] ?? run.status
}

/** Renders in the automation's own zone: the schedule fires there, wherever the phone is. */
function fmtStamp(ms: number, zone: string | null | undefined): string {
  const date = new Date(ms)
  const options = zone ? { timeZone: zone } : {}
  const day = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', ...options })
  const time = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  })
  return `${day} ${time}`
}

export function describeRrule(rrule: string): string {
  const parts = rrule.trim().split(/\s+/)
  if (parts.length === 5) {
    const [minute, hour, dom, month, dow] = parts
    if (/^\*\/\d+$/.test(minute) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
      return `每 ${minute.slice(2)} 分钟`
    }
    if (/^\d+$/.test(minute) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
      return `每小时 ${minute} 分`
    }
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && dom === '*' && month === '*') {
      const clock = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
      // cron accepts 7 as Sunday too; both 0 and 7 land on the same label.
      const day =
        dow === '*'
          ? '每天'
          : dow === '1-5'
            ? '工作日'
            : /^\d$/.test(dow)
              ? (WEEKDAYS[Number(dow) % 7] ?? dow)
              : dow
      return `${day} ${clock}`
    }
  }
  return rrule
}

function presetOf(rrule: string): SchedulePreset {
  const parts = rrule.trim().split(/\s+/)
  if (parts.length !== 5) {
    return 'cron'
  }
  const [minute, hour, dom, month, dow] = parts
  if (dom === '*' && month === '*') {
    if (/^\*\/\d+$/.test(minute) && hour === '*') {
      return 'minutes'
    }
    if (hour === '*' && /^\d+$/.test(minute)) {
      return 'hourly'
    }
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      if (dow === '*') {
        return 'daily'
      }
      if (dow === '1-5') {
        return 'weekdays'
      }
      if (/^\d$/.test(dow)) {
        return 'weekly'
      }
    }
  }
  return 'cron'
}

function clockFromRrule(rrule: string): string {
  const parts = rrule.trim().split(/\s+/)
  if (parts.length === 5 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
    return `${parts[1].padStart(2, '0')}:${parts[0].padStart(2, '0')}`
  }
  return '09:30'
}

function dayFromRrule(rrule: string): number {
  const dow = rrule.trim().split(/\s+/)[4] ?? ''
  if (!/^\d$/.test(dow)) {
    return 1
  }
  return Number(dow) % 7
}

function intervalFromRrule(rrule: string): number {
  const step = /^\*\/(\d+)$/.exec(rrule.trim().split(/\s+/)[0] ?? '')
  return step ? Number(step[1]) : 30
}

/** Each preset must produce a cron Orca accepts (five fields, real occurrences). */
function buildRrule(input: {
  preset: SchedulePreset
  time: string
  weekday: number
  minutes: number
  cron: string
}): string | null {
  const [hourText, minuteText] = input.time.split(':')
  const minute = Number(minuteText ?? 0)
  const hour = Number(hourText ?? 0)
  if (input.preset === 'daily' && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return `${minute} ${hour} * * *`
  }
  if (input.preset === 'weekdays' && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return `${minute} ${hour} * * 1-5`
  }
  if (input.preset === 'weekly' && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    return `${minute} ${hour} * * ${input.weekday}`
  }
  if (input.preset === 'hourly' && minute >= 0 && minute <= 59) {
    return `${minute} * * * *`
  }
  // Orca rejects a minute step above the 60-value domain, so 1–59 is the legal span.
  if (input.preset === 'minutes' && Number.isInteger(input.minutes) && input.minutes >= 1 && input.minutes <= 59) {
    return `*/${input.minutes} * * * *`
  }
  if (input.preset === 'cron') {
    const value = input.cron.trim()
    return /^[0-9*\/,-]+(\s+[0-9*\/,-]+){4}$/.test(value) ? value : null
  }
  return null
}
