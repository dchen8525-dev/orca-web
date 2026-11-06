export type Project = {
  id: string
  displayName: string
  sourceRepoIds?: string[]
}

export type AgentTask = {
  paneKey: string
  state: string
  agentType?: string
  conversationName?: string
  prompt?: string
  toolName?: string
  lastAssistantMessage?: string
  updatedAt?: number
}

export type WorktreeRow = {
  worktreeId: string
  repoId: string
  path: string
  branch?: string
  displayName?: string
  status?: string
  lastActivityAt?: number
  agents?: AgentTask[]
}

export type WorktreePs = { worktrees: WorktreeRow[] }

export type Projection = {
  sessionId: string
  status: string | null
  conversationName?: string
  latestPrompt?: string
  toolName?: string
  lastAssistantMessage?: string
  updatedAt?: number
}

export type StatusEvent =
  | { type: 'snapshot'; sessions: Projection[] }
  | { type: 'status'; session: Projection }
  | { type: 'end' }

export type PromptOption = { id: string; label: string; description?: string }

export type PromptQuestion = {
  id: string
  question: string
  header?: string
  multiSelect?: boolean
  options: PromptOption[]
  freeTextQuestionId?: string
  freeTextInput?: {
    allowEmpty?: boolean
    multiline?: boolean
    initialValue?: string
    placeholder?: string
  }
}

export type MessageBody = {
  kind: 'message'
  role: 'user' | 'assistant' | 'reasoning'
  blocks?: { type: string; text?: string; path?: string }[]
}

export type ToolCallBody = {
  kind: 'tool-call'
  name?: string
  input?: unknown
  state?: string
  output?: { head?: string; truncated?: boolean }
}

export type ApprovalBody = {
  kind: 'approval'
  title: string
  displayName?: string
  description?: string
  detail?: string | null
  options: PromptOption[]
  resolution?: { state: string; selectedOptionId?: string | null }
}

export type QuestionBody = {
  kind: 'question'
  question?: string
  options?: PromptOption[]
  questions?: PromptQuestion[]
  freeTextQuestionId?: string
  freeTextInput?: PromptQuestion['freeTextInput']
  resolution?: { state: string; selectedOptionId?: string | null }
}

export type HistoryBody = MessageBody | ToolCallBody | ApprovalBody | QuestionBody

export type HistoryItem = {
  itemId: string
  revision: number
  observedAt?: number
  body: HistoryBody
}

export type HistoryPage = {
  sessionId: string
  epoch: string
  fence?: number
  items: HistoryItem[]
  window?: { oldest: unknown; newest: unknown; nextCursor: unknown }
  hasOlder?: boolean
  liveCursor?: unknown
  latestTurn?: { itemId: string; observedAt: number; turn: { turnId: string; state: string } } | null
}

export type HistoryResult = { ok: boolean; page: HistoryPage; reset?: string }

export type Automation = {
  id: string
  name: string
  prompt: string
  agentId: string
  workspaceMode: 'existing' | 'new_per_run'
  workspaceId?: string | null
  timezone?: string | null
  rrule: string
  dtstart: number
  enabled: boolean
  nextRunAt?: number | null
  missedRunGraceMinutes?: number
  updatedAt?: number
}

/** Orca captures the run's terminal text on completion; it outlives the pane. */
export type AutomationRunOutputSnapshot = {
  format: 'plain_text'
  content: string
  capturedAt: number
  truncated: boolean
}

export type AutomationRun = {
  id: string
  automationId: string
  runNumber: number
  title: string
  scheduledFor: number
  status: string
  trigger: 'scheduled' | 'manual'
  outputSnapshot?: AutomationRunOutputSnapshot | null
  workspaceDisplayName?: string | null
  chatSessionId?: string | null
  terminalPaneKey?: string | null
  error?: string | null
}

export type AgentSessionModelOption = {
  id: string
  label?: string
  description?: string
  isDefault?: boolean
}

export type AgentSessionOptions = {
  models?: AgentSessionModelOption[]
  modelsKnown?: boolean
  current?: {
    model?: string
    permissionMode?: string
    reportedPermissionMode?: string | null | undefined
    effort?: string
    confirmed?: readonly string[]
  }
}

export function sessionIdFromPaneKey(paneKey: string): string | null {
  const match = /^structured-agent-session-(.+):[^:]+$/.exec(paneKey)
  return match ? match[1]! : null
}
