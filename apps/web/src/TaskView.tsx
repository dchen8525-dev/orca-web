import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HubClient, HubStatus } from './hub'
import { mutationEnvelope } from './envelope'
import { relativeTime, stateLabel, toneForState } from './Board'
import { Markdown } from './Markdown'
import type {
  ApprovalBody,
  AgentSessionOptions,
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

type OptionWriteResult =
  | { ok: true; fence?: number; value?: { options?: AgentSessionOptions } }
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
  const [options, setOptions] = useState<AgentSessionOptions | null>(null)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [optionBusyKey, setOptionBusyKey] = useState<string | null>(null)
  const [optionError, setOptionError] = useState<string | null>(null)
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

  // Options are per-open data, not live journal; an unsupported host keeps them hidden.
  const loadOptions = useCallback(async () => {
    try {
      setOptions(await hub.request<AgentSessionOptions>('agentSession.options', { sessionId }))
    } catch {
      setOptions(null)
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
      void loadOptions()
    }
  }, [status.gatewayConnected, load, loadOptions])

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

  // What the agent is doing right now, read off the tail: the newest running tool
  // names the activity, a streamed answer gets the caret, otherwise it is thinking.
  const stream = useMemo(() => {
    if (!running) {
      return { activity: '', caretItem: null as string | null }
    }
    const items = page?.items ?? []
    let caretItem: string | null = null
    let activity = '正在思考'
    for (let index = items.length - 1; index >= 0; index--) {
      const item = items[index]!
      if (item.body.kind === 'tool-call' && item.body.state === 'running') {
        activity = `正在 ${item.body.name ?? '动手'}`
        break
      }
      if (messageRole(item) === 'assistant') {
        caretItem = item.itemId
        activity = '正在回复'
        break
      }
    }
    return { activity, caretItem }
  }, [page?.items, running])

  const setOption = async (key: string, value: string) => {
    if (!page?.fence) {
      return
    }
    setOptionBusyKey(key)
    setOptionError(null)
    try {
      const fields = { key, value }
      const envelope = await mutationEnvelope({
        method: 'agentSession.setOption',
        sessionId,
        fence: page.fence,
        fields
      })
      const result = await hub.request<OptionWriteResult>('agentSession.setOption', {
        envelope,
        ...fields
      })
      if (!result.ok) {
        setOptionError(
          `${result.refusal.code}${result.refusal.message ? `: ${result.refusal.message}` : ''}`
        )
        return
      }
      // The fence advanced and the provider may have reshuffled the catalog; refresh both.
      await Promise.all([load(), loadOptions()])
    } catch (failure) {
      setOptionError((failure as Error).message)
    } finally {
      setOptionBusyKey(null)
    }
  }

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
            {running ? <i className="spin" aria-hidden="true" /> : null}
            {stateLabel(state)}
          </span>
          {options ? (
            <>
              <span className="sep">·</span>
              <button className="pill" onClick={() => setOptionsOpen(true)}>
                {`模型 ${currentModelLabel(options)}`}
              </button>
              <button className="pill" onClick={() => setOptionsOpen(true)}>
                {`权限 ${permissionModeLabel(options)}`}
              </button>
            </>
            ) : null}
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
                  live={item.itemId === stream.caretItem}
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
              live={entry.item.itemId === stream.caretItem}
              disabled={busy}
              onRespond={respond}
            />
          )
        )}
        {running && stream.activity && !error ? (
          <p className="thinking">
            <i className="spin" aria-hidden="true" />
            <span>{stream.activity}</span>
            <span className="think-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
        ) : null}
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
      {optionsOpen && options ? (
        <SessionOptionsSheet
          options={options}
          busyKey={optionBusyKey}
          error={optionError}
          onSet={(key, value) => void setOption(key, value)}
          onClose={() => setOptionsOpen(false)}
        />
      ) : null}
    </div>
  )
}

const PERMISSION_MODES: readonly { value: string; label: string; description: string }[] = [
  { value: 'ask', label: '每次都问', description: '编辑和命令都先找你要确认' },
  { value: 'accept-edits', label: '自动接受编辑', description: '文件编辑自动批，其余还要问' },
  { value: 'auto', label: '替我审批', description: '审批请求由系统替你回应' },
  { value: 'full-access', label: '全部放行', description: '所有编辑和命令都不再询问' },
  { value: 'own', label: 'agent 自己的设置', description: '沿用 agent 配置里的权限' }
] as const

function currentModelLabel(options: AgentSessionOptions): string {
  const id = options.current?.model
  const known = options.models?.find((model) => model.id === id)
  if (known?.label) {
    return shortLabel(known.label)
  }
  return id ? shortLabel(id) : '未报'
}

function permissionModeLabel(options: AgentSessionOptions): string {
  const value = options.current?.permissionMode ?? options.current?.reportedPermissionMode
  if (!value) {
    return '未报'
  }
  return PERMISSION_MODES.find((mode) => mode.value === value)?.label ?? value
}

function shortLabel(value: string): string {
  if (value.length > 24) {
    return `${value.slice(0, 23)}…`
  }
  return value
}

function SessionOptionsSheet({
  options,
  busyKey,
  error,
  onSet,
  onClose
}: {
  options: AgentSessionOptions
  busyKey: string | null
  error: string | null
  onSet: (key: string, value: string) => void
  onClose: () => void
}) {
  const current = options.current ?? {}
  const modelActive = (id: string): boolean => id === current.model
  return (
    <div className="sheet">
      <div className="topnav">
        <button className="back" onClick={onClose}>
          关闭
        </button>
        <span className="sheet-title">会话设置</span>
        <span className="where">{shortLabel(current.model ?? '')}</span>
      </div>
      <div className="rule" />
      <div className="sheet-body">
        {busyKey ? <p className="muted small">正在应用 {busyKey}…</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <p className="field-label">模型（下一回合生效）</p>
        {options.models?.length ? (
          <div className="chips">
            {options.models.map((model) => (
              <button
                key={model.id}
                className={`chip${modelActive(model.id) ? ' chip-active' : ''}`}
                disabled={busyKey !== null}
                title={model.description}
                onClick={() => onSet('model', model.id)}
              >
                {model.label ?? model.id}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small">没有获取到可选模型</p>
        )}

        <p className="field-label">权限（决定 agent 什么时候来找你确认）</p>
        <div className="chips">
          {PERMISSION_MODES.map((mode) => (
            <button
              key={mode.value}
              className={`chip${current.permissionMode === mode.value ? ' chip-active' : ''}`}
              disabled={busyKey !== null}
              title={mode.description}
              onClick={() => onSet('permissionMode', mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
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
  live = false,
  disabled,
  onRespond
}: {
  item: HistoryItem
  agent?: string
  showRole: boolean
  live?: boolean
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
        <div className="body">
          {body.role === 'user' ? text : <Markdown text={text} />}
          {live && body.role === 'assistant' ? <span className="caret" aria-hidden="true" /> : null}
        </div>
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
          {body.state === 'running' ? (
            <span className="meta">
              <i className="spin" aria-hidden="true" />
              进行中
            </span>
          ) : null}
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
