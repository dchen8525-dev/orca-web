import { useEffect, useState } from 'react'
import type { HubClient } from './hub'
import { mutationEnvelope } from './envelope'
import type { WorktreeRow } from './types'

type CreateResult =
  | { ok: true; fence?: number }
  | { ok: false; refusal: { code: string; message?: string } }

export function CreateTask({
  hub,
  worktree,
  candidates,
  onClose,
  onCreated
}: {
  hub: HubClient
  worktree: WorktreeRow
  candidates: string[]
  onClose: () => void
  onCreated: (task: { sessionId: string; title: string; agent: string }) => void
}) {
  const [supported, setSupported] = useState<string[] | null>(null)
  const [agent, setAgent] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const replies = await Promise.all(
        candidates.map(async (name) => {
          try {
            const reply = await hub.request<{ supported?: boolean }>('agentSession.createSupport', {
              worktree: `id:${worktree.worktreeId}`,
              agent: name
            })
            return reply?.supported === true ? name : null
          } catch {
            return null
          }
        })
      )
      if (cancelled) {
        return
      }
      const available = replies.filter((name): name is string => name !== null)
      setSupported(available)
      setAgent((current) => (current && available.includes(current) ? current : (available[0] ?? null)))
    })()
    return () => {
      cancelled = true
    }
  }, [hub, worktree.worktreeId, candidates])

  const create = async () => {
    if (!agent) {
      return
    }
    setBusy(true)
    setError(null)
    const sessionId = `${agent}_${crypto.randomUUID().replaceAll('-', '_')}`
    const message = text.trim()
    const fields: Record<string, unknown> = {
      worktree: `id:${worktree.worktreeId}`,
      agent,
      ...(message
        ? {
            firstMessage: {
              clientMessageId: crypto.randomUUID(),
              body: {
                kind: 'message',
                role: 'user',
                blocks: [{ type: 'text', text: message }]
              }
            }
          }
        : {})
    }
    try {
      const envelope = await mutationEnvelope({
        method: 'agentSession.create',
        sessionId,
        fence: null,
        fields
      })
      const result = await hub.request<CreateResult>('agentSession.create', { envelope, ...fields })
      if (!result.ok) {
        setError(`${result.refusal.code}${result.refusal.message ? `: ${result.refusal.message}` : ''}`)
        return
      }
      onCreated({ sessionId, title: firstLine(message) || '新任务', agent })
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
        <span className="sheet-title">新建任务</span>
        <button className="primary" onClick={() => void create()} disabled={busy || !agent}>
          {busy ? '创建中…' : '创建'}
        </button>
      </div>
      <div className="rule" />

      <div className="sheet-body">
        <p className="sheet-context">
          ⑂ {worktree.displayName ?? worktree.branch ?? worktree.path}
        </p>

        <p className="field-label">Agent</p>
        {supported === null ? (
          <p className="muted small">检查可用 agent…</p>
        ) : supported.length === 0 ? (
          <p className="error">这个工作区没有可用的结构化 agent</p>
        ) : (
          <div className="chips">
            {supported.map((name) => (
              <button
                key={name}
                className={`chip${name === agent ? ' chip-active' : ''}`}
                onClick={() => setAgent(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <p className="field-label">任务内容</p>
        <textarea
          className="sheet-textarea"
          rows={7}
          placeholder="描述要 agent 做什么…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  )
}

function firstLine(value: string): string {
  const line = value.split('\n')[0] ?? ''
  return line.length > 60 ? `${line.slice(0, 60)}…` : line
}
