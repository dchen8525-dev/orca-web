# Build plan

## Decisions already made

- Single user, own login. VPS may see plaintext; TLS + password auth, no browser↔home E2EE in v1.
- Desktop Orca stays running (no headless `orca serve` requirement in v1).
- Scope: view projects/tasks, read history, reply, approve/answer, create, cancel.
- Zero Orca patches for v1; the protocol layer is reimplemented in this repo.

## Wire facts confirmed against Orca 1.4.249

1. **Client capabilities are mandatory.** After the E2EE handshake, a socket must call
   `runtime.clientCapabilities.update` with `agent-session.structured.v1` (plus the
   claude/registered-agents/current-requests/turn-item set in
   `src/gateway/orca/client-capabilities.ts`). Without it, every `agentSession.*` call is refused
   with `structured_agent_session_unsupported` / `clientCapabilityMissing`.
2. **Capabilities are per socket**, not per device token: re-advertise after every reconnect.
3. **`worktree.ps` is the authoritative list.** Each row carries `agents[]` with `state`,
   `agentType`, `conversationName`, `prompt`, `toolName`, `lastAssistantMessage`, `updatedAt`,
   `children[]` (subagents). A task list needs no per-session reads.
4. **`agentSession.subscribeStatus` is for live updates.** Its first snapshot can be empty while
   the host seeds its roster; an empty snapshot means "not seeded yet", not "no tasks". The next
   snapshot carries every projection. Do not build list membership from this feed.
5. **Session id from a pane key**: `structured-agent-session-<sessionId>:<paneId>`.
6. **Fence**: `agentSession.history` returns `page.fence`; `agentSession.subscribe` snapshots carry
   `fence`. Mutations must send the current fence.
7. **Fingerprint**: sha256 over a canonical JSON string with recursively sorted keys and
   `undefined` fields dropped, of `{method, sessionId, fields}`. The host recomputes it from the
   request it received and refuses a mismatch with `agent_session_operation_conflict` /
   `fingerprintMismatch` (verified live).
8. **Create is two-step and retry-safe**: `agentSession.createSupport {worktree: "id:<worktreeId>",
   agent}` → `agentSession.create` with `expectedRuntimeFence: null`; replay the identical envelope
   after an ambiguous failure, never mint a second session.
9. **`agentSession.currentRequests` needs a version**: `{sessionId, version, cursor?}` — a bare
   `{sessionId}` is refused. `version` comes from the `currentRequests` marker on
   `agentSession.subscribe` frames, whose items are paged via `nextCursor`.
10. **Prompt fingerprint method is `agentSession.respondTo:<kind>`**, not the RPC method name:
    `respondToApproval` / `respondToQuestion` fingerprint over `agentSession.respondTo:approval`
    and `:question` with fields `{itemId, expectedRevision, optionId?}` or `{…, answers?}`.
11. **Question answers**: `answers: [{questionId, optionIds[], other?}]`, one entry per question;
    a single-question item's id is `q1` unless `freeTextQuestionId` names it.
12. **Orca caps one runtime at 128 WebSocket connections.** A client that redials while already
    connected silently leaks sockets until every new connection is refused with
    `1013 Maximum connections reached` (this bit the gateway; see Phase 1).

## Phases

### Phase 0 — protocol proof (done)

Done: handshake, auth, capabilities, projects/worktrees, tasks, history, status feed, envelope
fingerprint check, and the write cycle on a throwaway chat:

```
create  ok  claude_<uuid> fence=1
send    ok  fence=1
turn    69c04845-… state=running
cancel  ok  fence=2
close   {"ok":true}
```

`agentSession.create` with `firstMessage` is now verified live too: the created chat ran its
first turn (`claude_…` → reasoning → `ok`) and `agentSession.close` returned `{"ok":true}`.

Remaining check: the approvals/questions round trip (needs an agent that actually blocks on a
prompt; the item rendering and payload shapes are implemented from the wire schemas).

### Phase 1 — gateway (home) — done, pending deployment

`apps/gateway`:

- config file + env overrides; `--local-orca` dev shortcut
- outbound WSS to the hub, hello auth (`key`), jittered backoff, app-level ping/pong liveness
- one Orca socket, re-dial + re-advertise capabilities on loss
- hub request ids map 1:1 to Orca request ids; unary results and stream frames forwarded
- subscriptions owned by the hub id; replayed after an Orca reconnect, `stream-reset` first
- hub reconnect drops hub-owned subscriptions; the hub re-issues them

Verified locally through `scripts/dev-hub.ts`: status, projects, worktrees/tasks, status feed,
history. Not yet verified: a real TLS hub, and reconnect of the Orca socket mid-subscription.

Fixed after live testing: the bridge reconnected on a 500 ms timer *while still connected*,
leaking one Orca socket per attempt until Orca's 128-connection cap refused everything with
`1013`. The loop now waits for the socket to close (`connection.onClose`) before redialling, so a
steady state is exactly one Orca socket.

### Phase 2 — server (VPS) — done

`apps/server`:

- `node:http` + `ws`; TLS terminated by Caddy (`docs/DEPLOY.md`)
- login: scrypt hash in config; opaque session token stored by hash, rolling 30-day cookie
  (`HttpOnly; Secure; SameSite=Strict`); 10 failures / 15 min per IP
- `wss://host/client` — cookie-authenticated at upgrade, `Origin` checked against `publicOrigin`
- `wss://host/gateway` — one connection, hello `key` compared by hash; a new one replaces the old
- hub maps browser ids to gateway ids, fans stream frames out, replays subscriptions on gateway
  reconnect and emits `stream-reset`; browser disconnect unsubscribes its streams
- no Orca credentials on the VPS; nothing is logged but state transitions

Verified locally: 10/10 checks in `scripts/dev-server-check.ts`.
Not yet verified: TLS termination through Caddy, and gateway drop with browsers attached.

### Phase 3 — web UI (done, mobile-viewport verified)

`apps/web` (Vite + React 19, built to `apps/web/dist` and served by `apps/server`):

- task board: projects → worktrees → agent tasks, state badge (`working` / `attention` / `idle`),
  live updates from the status feed; branch shown once per worktree
- task detail: history tail (40 items, growing as older pages load), "载入更早" via
  `direction: 'before'` + `page.window.oldest`, dependency-free markdown subset, tool calls
- reply: `agentSession.send` with the current fence
- stop: `agentSession.cancel` with the running turn id
- approvals/questions: cards rendered from history items; approvals answer on tap, questions
  select (multi-select aware) with optional free text, then `respondToApproval` /
  `respondToQuestion`
- new task: `＋` on a worktree → `createSupport` probe per candidate agent → `create` with an
  optional first message → opens the new task

Verified with a headless Chrome at 390×844 against the live runtime through the real hub:
login, board, create sheet, task view, and a full create-with-first-message (agent answered `ok`;
the throwaway chat was closed afterwards).

### Phase 4 — operations

- systemd units for server and gateway, restart on failure
- health endpoint: gateway connected, last Orca handshake time
- rotate the device token by re-pairing; the VPS never holds Orca credentials
