import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HubClient, HubStatus } from './hub'
import { mutationEnvelope } from './envelope'
import { relativeTime, stateLabel, toneForState } from './Board'
import { Markdown } from './Markdown'
import type {
  ApprovalBody,
  HistoryItem,
  HistoryPage,
  HistoryResult,
  PromptQuestion,
  QuestionBody,
  ToolCallBody
} from './types'

type MutationResult =
  | { ok: true; fence?: number }
  | { ok: false; refusal: { code: string; message?: string } }

type PromptKind = 'approval' | 'question'
type Respond = (item: HistoryItem, kind: PromptKind, fields: Record<string, unknown>) => Promise<void>

type Entry =
  | { kind: 'item'; key: string; item: HistoryItem; showRole: boolean }
  | { kind: 'steps'; key: string; items: HistoryItem[] }

export function TaskView({
  hub,
  sessionId,
  title,
  agent,
  status,
  onBack
}: {
  hub: HubClient
  sessionId: string
  title: string
  agent?: string
  status: HubStatus
  onBack: () => void
}) {
  const [page, setPage] = useState<HistoryPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Older pages must survive live refetches, so the tail grows as they are loaded.
  const olderCount = useRef(0)

  const load = useCallback(async () => {
    try {
      const history = await hub.request<HistoryResult>('agentSession.history', {
        sessionId,
        direction: 'tail',
        limit: Math.min(200, 40 + olderCount.current)
      })
      if (history.page) {
        setPage(history.page)
      }
      setError(null)
    } catch (failure) {
      setError((failure as Error).message)
    }
  }, [hub, sessionId])

  const loadOlder = async () => {
    const cursor = page?.window?.oldest
    if (!page || !cursor) {
      return
    }
    setLoadingOlder(true)
    setError(null)
    const element = scrollRef.current
    const before = element?.scrollHeight ?? 0
    try {
      const older = await hub.request<HistoryResult>('agentSession.history', {
        sessionId,
        direction: 'before',
        limit: 40,
        cursor
      })
      if (older.page) {
        const seen = new Set(page.items.map((item) => item.itemId))
        const added = older.page.items.filter((item) => !seen.has(item.itemId))
        olderCount.current += added.length
        setPage({ ...page, items: [...added, ...page.items], hasOlder: older.page.hasOlder })
        if (element) {
          requestAnimationFrame(() => {
            element.scrollTop += element.scrollHeight - before
          })
        }
      }
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    if (status.gatewayConnected) {
      void load()
    }
  }, [status.gatewayConnected, load])

  useEffect(() => {
    if (!status.gatewayConnected) {
      return
    }
    return hub.subscribe('agentSession.subscribe', { sessionId }, (event) => {
      if (event.kind === 'error') {
        setError(event.message)
        return
      }
      if (loadTimer.current) {
        clearTimeout(loadTimer.current)
      }
      // Frames arrive in bursts; one refetch per burst is enough for this view.
      loadTimer.current = setTimeout(() => void load(), 350)
    })
  }, [hub, sessionId, status.gatewayConnected, load])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 240
    if (nearBottom || !element.dataset.initialized) {
      element.scrollTop = element.scrollHeight
      element.dataset.initialized = 'true'
    }
  }, [page?.items.length])

  const send = async () => {
    const body = {
      kind: 'message',
      role: 'user',
      blocks: [{ type: 'text', text: text.trimEnd() }]
    }
    if (!page?.fence || !text.trim()) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const envelope = await mutationEnvelope({
        method: 'agentSession.send',
        sessionId,
        fence: page.fence,
        fields: { body }
      })
      const result = await hub.request<MutationResult>('agentSession.send', { envelope, body })
      if (!result.ok) {
        setError(`${result.refusal.code}${result.refusal.message ? `: ${result.refusal.message}` : ''}`)
        return
      }
      setText('')
      await load()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    const turn = page?.latestTurn?.turn
    if (!page?.fence || !turn) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const fields = { turnId: turn.turnId }
      const envelope = await mutationEnvelope({
        method: 'agentSession.cancel',
        sessionId,
        fence: page.fence,
        fields
      })
      const result = await hub.request<MutationResult>('agentSession.cancel', { envelope, ...fields })
      if (!result.ok) {
        setError(`${result.refusal.code}${result.refusal.message ? `: ${result.refusal.message}` : ''}`)
      }
      await load()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Prompt fingerprints hash `agentSession.respondTo:<kind>`, not the RPC method name.
  const respond: Respond = async (item, kind, fields) => {
    if (!page?.fence) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const envelope = await mutationEnvelope({
        method: `agentSession.respondTo:${kind}`,
        sessionId,
        fence: page.fence,
        fields
      })
      const method =
        kind === 'approval' ? 'agentSession.respondToApproval' : 'agentSession.respondToQuestion'
      const result = await hub.request<MutationResult>(method, { envelope, ...fields })
      if (!result.ok) {
        setError(`${result.refusal.code}${result.refusal.message ? `: ${result.refusal.message}` : ''}`)
      }
      await load()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const running = page?.latestTurn?.turn.state === 'running'
  const state = running ? 'working' : 'idle'
  const tone = toneForState(state)

  // Role labels only where the speaker changes, and a long run of tool calls folds into
  // one line so the conversation stays readable on a phone.
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = []
    let previous: 'user' | 'assistant' | null = null
    let steps: HistoryItem[] = []
    const flushSteps = () => {
      if (steps.length > 0) {
        list.push({ kind: 'steps', key: steps[0]!.itemId, items: steps })
        steps = []
      }
    }
    for (const item of page?.items ?? []) {
      if (isStep(item)) {
        steps.push(item)
        continue
      }
      flushSteps()
      const role = messageRole(item)
      const showRole = role !== null && role !== previous
      if (role !== null) {
        previous = role
      }
      list.push({ kind: 'item', key: item.itemId, item, showRole })
    }
    flushSteps()
    return list
  }, [page?.items])

  return (
    <div className="app task-view">
      <div className="topnav">
        <button className="back" onClick={onBack}>
          ← 返回
        </button>
        <span className="where">{`${agent ?? 'agent'} / ${shortId(sessionId)}`}</span>
        {running ? (
          <button className="stop" onClick={() => void stop()} disabled={busy}>
            停止
          </button>
        ) : null}
      </div>
      <div className="rule" />

      <div className="article-head">
        <div className="eyebrow">{`${agent ?? 'agent'} 的工作记录`}</div>
        <h1>{title}</h1>
        <div className="byline">
          <span className={`pill${tone === 'green' ? ' pill-green' : tone === 'amber' ? ' pill-amber' : ''}`}>
            {stateLabel(state)}
          </span>
          {lastUpdated(page) ? (
            <>
              <span className="sep">·</span>
              <span>{lastUpdated(page)}</span>
            </>
          ) : null}
          {!status.gatewayConnected ? (
            <>
              <span className="sep">·</span>
              <span>连接已断开</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="rule" />

      <div className="messages" ref={scrollRef}>
        {!status.gatewayConnected ? <p className="empty">连接已断开，等待恢复…</p> : null}
        {page?.hasOlder ? (
          <button className="load-older" onClick={() => void loadOlder()} disabled={loadingOlder}>
            {loadingOlder ? '载入中…' : '载入更早的消息'}
          </button>
        ) : null}
        {entries.map((entry) =>
          entry.kind === 'steps' ? (
            entry.items.length > 2 ? (
              <StepGroup
                key={entry.key}
                items={entry.items}
                agent={agent}
                disabled={busy}
                onRespond={respond}
              />
            ) : (
              entry.items.map((item) => (
                <Item
                  key={item.itemId}
                  item={item}
                  agent={agent}
                  showRole={false}
                  disabled={busy}
                  onRespond={respond}
                />
              ))
            )
          ) : (
            <Item
              key={entry.key}
              item={entry.item}
              agent={agent}
              showRole={entry.showRole}
              disabled={busy}
              onRespond={respond}
            />
          )
        )}
        {page && page.items.length === 0 ? <p className="empty">还没有消息</p> : null}
        {!page && !error ? <p className="empty">载入中…</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="composer">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={running ? '回复（会排队）…' : '写一条回复…'}
          rows={1}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void send()
            }
          }}
        />
        <button onClick={() => void send()} disabled={busy || !text.trim()}>
          发送 →
        </button>
      </div>
    </div>
  )
}

function shortId(sessionId: string): string {
  return sessionId.length > 12 ? `${sessionId.slice(0, 5)}…${sessionId.slice(-4)}` : sessionId
}

function messageRole(item: HistoryItem): 'user' | 'assistant' | null {
  const body = item.body
  if (body.kind !== 'message' || body.role === 'reasoning') {
    return null
  }
  return body.role === 'user' ? 'user' : 'assistant'
}

function isStep(item: HistoryItem): boolean {
  return (
    item.body.kind === 'tool-call' ||
    (item.body.kind === 'message' && item.body.role === 'reasoning')
  )
}

function StepGroup({
  items,
  agent,
  disabled,
  onRespond
}: {
  items: HistoryItem[]
  agent?: string
  disabled: boolean
  onRespond: Respond
}) {
  const tools = items.filter((item) => item.body.kind === 'tool-call')
  const lastName = (tools[tools.length - 1]?.body as ToolCallBody | undefined)?.name
  return (
    <details className="step-group">
      <summary>
        <span className="lead">↳</span>
        <span className="name">{items.length} 步</span>
        <span className="what">{lastName ? `最近 ${lastName}` : '思考与工具调用'}</span>
      </summary>
      <div className="step-list">
        {items.map((item) => (
          <Item
            key={item.itemId}
            item={item}
            agent={agent}
            showRole={false}
            disabled={disabled}
            onRespond={onRespond}
          />
        ))}
      </div>
    </details>
  )
}

function lastUpdated(page: HistoryPage | null): string {
  const last = page?.items[page.items.length - 1]
  return last?.observedAt ? relativeTime(last.observedAt) : ''
}

function Item({
  item,
  agent,
  showRole,
  disabled,
  onRespond
}: {
  item: HistoryItem
  agent?: string
  showRole: boolean
  disabled: boolean
  onRespond: Respond
}) {
  const body = item.body
  if (body.kind === 'message') {
    const text = (body.blocks ?? [])
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
    if (!text) {
      return null
    }
    if (body.role === 'reasoning') {
      return (
        <details className="reasoning">
          <summary>↳ 思考过程</summary>
          <pre>{text}</pre>
        </details>
      )
    }
    return (
      <div className={`turn${body.role === 'user' ? ' turn-user' : ''}`}>
        {showRole ? <div className="role">{body.role === 'user' ? '你' : (agent ?? 'agent')}</div> : null}
        <div className="body">{body.role === 'user' ? text : <Markdown text={text} />}</div>
      </div>
    )
  }

  if (body.kind === 'tool-call') {
    return (
      <details className="footnote">
        <summary>
          <span className="lead">↳</span>
          <span className="name">{body.name ?? '工具'}</span>
          <span className="what">{summarizeToolInput(body.input)}</span>
          {body.state === 'running' ? <span className="meta">进行中</span> : null}
        </summary>
        <pre>{body.output?.head ?? JSON.stringify(body.input, null, 2)}</pre>
      </details>
    )
  }

  if (body.kind === 'approval') {
    return <ApprovalPrompt item={item} body={body} disabled={disabled} onRespond={onRespond} />
  }

  if (body.kind === 'question') {
    return <QuestionPrompt item={item} body={body} disabled={disabled} onRespond={onRespond} />
  }

  return null
}

function ApprovalPrompt({
  item,
  body,
  disabled,
  onRespond
}: {
  item: HistoryItem
  body: ApprovalBody
  disabled: boolean
  onRespond: Respond
}) {
  const pending = (body.resolution?.state ?? 'pending') === 'pending'
  const chosen = body.options?.find((option) => option.id === body.resolution?.selectedOptionId)
  return (
    <div className="note">
      <div className="note-label">需要你的确认</div>
      <h3>{body.title || body.displayName || 'agent 请求执行操作'}</h3>
      {body.description ? <p className="note-desc">{body.description}</p> : null}
      {body.detail ? <pre className="note-detail">{body.detail}</pre> : null}
      {pending ? (
        <div className="note-actions">
          {(body.options ?? []).map((option, index) => (
            <button
              key={option.id}
              className={index === 0 ? 'allow' : 'deny'}
              title={option.description}
              disabled={disabled}
              onClick={() =>
                void onRespond(item, 'approval', {
                  itemId: item.itemId,
                  expectedRevision: item.revision,
                  optionId: option.id
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="resolved">{chosen ? `已选择：${chosen.label}` : '已处理'}</p>
      )}
    </div>
  )
}

function QuestionPrompt({
  item,
  body,
  disabled,
  onRespond
}: {
  item: HistoryItem
  body: QuestionBody
  disabled: boolean
  onRespond: Respond
}) {
  const questions = useMemo<PromptQuestion[]>(() => {
    if (body.questions?.length) {
      return body.questions
    }
    return [
      {
        id: body.freeTextQuestionId ?? 'q1',
        question: body.question ?? '',
        options: body.options ?? [],
        multiSelect: false,
        ...(body.freeTextQuestionId ? { freeTextQuestionId: body.freeTextQuestionId } : {}),
        ...(body.freeTextInput ? { freeTextInput: body.freeTextInput } : {})
      }
    ]
  }, [body])
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const pending = (body.resolution?.state ?? 'pending') === 'pending'

  const toggle = (question: PromptQuestion, optionId: string) => {
    setPicked((previous) => {
      const current = previous[question.id] ?? []
      const next = question.multiSelect
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        : [optionId]
      return { ...previous, [question.id]: next }
    })
  }

  const answered = (question: PromptQuestion): boolean => {
    if ((picked[question.id]?.length ?? 0) > 0) {
      return true
    }
    if (!question.freeTextQuestionId) {
      return false
    }
    const typed = other[question.id] ?? ''
    return question.freeTextInput?.allowEmpty === true || typed.trim().length > 0
  }

  const complete = questions.every(answered)

  const submit = () => {
    const answers = questions.map((question) => {
      const typed = other[question.id] ?? ''
      return {
        questionId: question.id,
        optionIds: picked[question.id] ?? [],
        ...(question.freeTextQuestionId && typed.trim().length > 0 ? { other: typed } : {})
      }
    })
    void onRespond(item, 'question', {
      itemId: item.itemId,
      expectedRevision: item.revision,
      answers
    })
  }

  if (!pending) {
    return (
      <div className="note">
        <div className="note-label">提问</div>
        {questions.map((question) => (
          <h3 key={question.id}>{question.header ?? question.question}</h3>
        ))}
        <p className="resolved">已回答</p>
      </div>
    )
  }

  return (
    <div className="note">
      <div className="note-label">需要回答</div>
      {questions.map((question) => (
        <div key={question.id} className="question">
          {question.header ? <p className="question-header">{question.header}</p> : null}
          <p className="question-title">{question.question}</p>
          <div className="options">
            {(question.options ?? []).map((option) => {
              const active = (picked[question.id] ?? []).includes(option.id)
              return (
                <button
                  key={option.id}
                  className={`option${active ? ' option-active' : ''}`}
                  disabled={disabled}
                  onClick={() => toggle(question, option.id)}
                >
                  <span className="option-label">{option.label}</span>
                  {option.description ? <small>{option.description}</small> : null}
                </button>
              )
            })}
          </div>
          {question.freeTextQuestionId ? (
            <textarea
              className="answer-input"
              rows={2}
              placeholder={question.freeTextInput?.placeholder ?? '其他答案…'}
              value={other[question.id] ?? ''}
              onChange={(event) =>
                setOther((previous) => ({ ...previous, [question.id]: event.target.value }))
              }
            />
          ) : null}
        </div>
      ))}
      <button className="submit" disabled={disabled || !complete} onClick={submit}>
        提交
      </button>
    </div>
  )
}

function summarizeToolInput(input: unknown): string {
  if (!input || typeof input !== 'object') {
    return ''
  }
  const record = input as Record<string, unknown>
  const candidate =
    record.description ?? record.file_path ?? record.path ?? record.command ?? record.query ?? ''
  const text = typeof candidate === 'string' ? candidate : JSON.stringify(candidate)
  return text.length > 100 ? `${text.slice(0, 100)}…` : text
}
