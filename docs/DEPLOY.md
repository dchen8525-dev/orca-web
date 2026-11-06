# Deploy

Two processes on two machines, one shared secret.

The scripted path: `scripts/deploy-web.sh` (typecheck + build + swap + verify) and
`scripts/deploy-server.sh` (typecheck + sync sources + restart). Both target the ssh host
alias `orca-web` by default — override with `ORCA_WEB_SSH`. Keep hostnames out of this repo;
the ssh alias lives in the operator's `~/.ssh/config`.

## VPS

1. `node scripts/hash-password.ts` → put the hash in `apps/server/config.json`
   (`passwordHash`), generate the gateway key (`openssl rand -base64 32`) into the same file.
   Set `publicOrigin` to the real origin and `trustProxy: true` behind Caddy.
   Set `sessionStorePath` (e.g. `/var/lib/orca-web/sessions.json`): it holds hashed session keys
   only, and without it every server restart logs the browser out.
2. systemd:

```ini
[Unit]
Description=orca-web hub
After=network-online.target

[Service]
WorkingDirectory=/opt/orca-web
ExecStart=/usr/bin/node apps/server/src/main.ts
Restart=always
RestartSec=2
Environment=ORCA_WEB_SERVER_CONFIG=/etc/orca-web/server.json
StateDirectory=orca-web
ReadWritePaths=/var/lib/orca-web
UMask=0077

[Install]
WantedBy=multi-user.target
```

3. Caddy (TLS + WebSocket upgrade are automatic):

```
orca.example.com {
	reverse_proxy 127.0.0.1:8788
}
```

The server binds loopback only; Caddy terminates TLS. `X-Forwarded-For` feeds login rate limiting
because `trustProxy` is on.

## Home machine

`apps/gateway/config.json` with `serverUrl: wss://orca.example.com/gateway`, the same
`gatewayKey`, and the Orca pairing material:

```json
{
  "serverUrl": "wss://orca.example.com/gateway",
  "gatewayKey": "…",
  "gatewayId": "home-desktop",
  "orca": {
    "endpoint": "ws://127.0.0.1:6768",
    "deviceToken": "…",
    "hostPublicKeyB64": "…"
  }
}
```

Get the last two by pairing a `mobile`-scope device in Orca and copying `endpoint`, `deviceToken`,
`publicKeyB64` from the `orca://pair?code=…` payload. The token is a bearer credential: keep the
config file at `0600` and out of git. Revoke the device in Orca if the file leaks.

Run it under systemd (or Task Scheduler on Windows) beside desktop Orca. It never listens on a
public port, so no router or firewall change is needed at home.

The gateway opens one loopback-only page at `http://127.0.0.1:8790` (`admin.port` or
`ORCA_WEB_ADMIN_PORT` moves it): connection status, hub address/key, and a box for a fresh
`orca://pair?code=…`. Changes load in place — validate, write the config file, swap the
connections — and the process restarts itself if a swap fails. Run the gateway with `--config`
so the page has somewhere to persist what you type.

## Checks

- `curl https://orca.example.com/api/health` → `gateway.connected: true`
- log in, then `dev:server-check` equivalents against the real origin
- rotate: change the password hash + restart; re-pair the gateway device to replace its token

## Current deployment

The live instance runs on a small Debian 13 VPS: Caddy in front, `orca-web.service` under
`/opt/orca-web`, config in `/etc/orca-web/server.json`, sessions in
`/var/lib/orca-web/sessions.json`. Hostnames and credentials are deliberately not recorded in this
repo.

No domain was bought for it. `sslip.io` resolves `<ip-with-dashes>.sslip.io` to that bare IP, so a
throwaway hostname like `203-0-113-7.sslip.io` gets a real Let's Encrypt certificate. That matters:
a self-signed or plain-HTTP origin would break `crypto.subtle` and `crypto.randomUUID`, which the
mutation envelope needs.

Windows autostart: `scripts/gateway-loop.cmd` runs the gateway and restarts it if it exits;
`scripts/gateway-autostart.vbs` (copied into the user's Startup folder) launches that loop hidden at
logon. A logon trigger is deliberate — the gateway must run as the same user as desktop Orca to read
its pairing material and reach `127.0.0.1`.
