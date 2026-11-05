// Wire capability strings mirrored from Orca (MIT), see docs/UPSTREAM.md. Orca refuses
// agentSession.* to a paired client that never advertised structured-session support.
export const ORCA_WEB_CLIENT_CAPABILITIES = [
  'agent-session.structured.v1',
  'agent-session.structured.claude.v1',
  'agent-session.structured.registered-agents.v1',
  'agent-session.structured.client-launch-mode.v1',
  'agent-session.options.optional-model.v1',
  'agent-session.pending-send-result.v1',
  'agent-session.turn-item.v1',
  'agent-session.current-requests.v1',
  'agent-session.commands-on-request.v1',
  'agent-session.coherent-model-catalog.v1',
  'agent-session.session-boundary.v1',
  'agent-session.background-task-stop.v1',
  'agent-session.background-task-row-stop.v1',
  'agent-session.background-task-child-views.v1',
  'agentSession.create.message.v1',
  'session-tabs.close-intent.v1',
  'session-tabs.authoritative-inventory.v1'
] as const
