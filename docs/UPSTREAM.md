# Upstream contract

This project speaks the Orca remote-runtime protocol. Nothing here is a fork of Orca; the
protocol is reimplemented against upstream source so Orca can be upgraded independently.

## Pinned upstream

| Item | Value |
| --- | --- |
| Repo | `git@github.com:stablyai/orca.git` |
| Local checkout | `D:\work\orca` |
| Version seen at protocol implementation | `1.4.214` |
| License | MIT |

## What we depend on

Wire facts, all from `D:\work\orca`:

- Transport: one WebSocket, JSON-RPC-ish envelopes, no HTTP API.
- E2EE v2: `e2ee_hello` (plaintext) -> `e2ee_ready` (plaintext) -> sealed `e2ee_auth` -> sealed `e2ee_authenticated`, then sealed request/response frames.
- Pairing offer v2 fields: `endpoint`, `deviceToken`, `publicKeyB64`, `scope` (`mobile` for us).
- Mobile-scope method allowlist: `src/main/runtime/runtime-rpc/runtime-rpc-mobile-method-routing.ts`.
- Mutation envelope: `sessionId`, `clientOperationId`, `expectedRuntimeFence`, `payloadFingerprint`.

Source of truth files (upstream paths):

- `src/shared/remote-runtime/e2ee/mobile-e2ee-v2-contract.ts`
- `src/shared/remote-runtime/e2ee/mobile-e2ee-v2-framing.ts`
- `src/shared/remote-runtime/e2ee/node/mobile-e2ee-v2-node-key-schedule.ts`
- `src/shared/remote-runtime/e2ee/paired-e2ee-client-handshake.ts`
- `src/main/runtime/rpc/e2ee-channel.ts`
- `src/main/runtime/runtime-rpc/runtime-rpc-mobile-method-routing.ts`
- `src/shared/rpc-contract/structured-agent-session-params.ts`

## Upgrade procedure

When Orca updates, re-check the files above. `scripts/phase0-smoke.ts` is the contract test: it
fails loudly if the handshake, framing, or a method signature drifts.
