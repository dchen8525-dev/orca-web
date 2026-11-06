# Deploy

Two processes on two machines, one shared secret (the gateway key). Nothing at home has to
listen on a public port and nothing here needs a package manager beyond itself.

Pushing a semver tag (`v0.1.0`) triggers `.github/workflows/release.yml` and attaches:

| artifact | what it is | where it goes |
|---|---|---|
| `orca-server-linux-amd64.deb` | self-contained hub binary + web dist + systemd unit (`orca-web.service`) | Debian/Ubuntu VPS |
| `orca-gateway-windows-x64.exe` | self-contained gateway binary (runtime embedded, ~110MB) | home Windows machine |
| `orca-web-release.tar.gz` (+ `.sha256`) | `.cjs` bundles + web dist — fallback for non-deb hosts | manual |

"Self-contained" means the bun runtime is compiled in: neither the VPS nor the home machine
needs Node.

## VPS, fresh

`bash scripts/bootstrap-server.sh --remote <sslip-domain>` — the script sshes over (default
alias `orca-web`, override `ORCA_WEB_SSH`), the VPS downloads the latest release deb,
verifies its sha256, and `dpkg -i`s it. On first install the postinst creates the
`orca-web` system user, generates `/etc/orca-web/server.json`
(`--init-config` writes gateway key + password hash, password printed once in the dpkg
output) and starts `orca-web.service`. Without a repo on the operator side, that is the whole
install. Existing configs on an upgrade are never overwritten; the deb's postinst only
replaces the unit file and restarts.

From a repo checkout instead: `bash scripts/bootstrap-server.sh <alias> <domain>` builds the
same payload locally (bun cross-compile + web dist) and installs over ssh — handy to test
uncommitted changes without tagging.

The pre-written config shape (if you'd rather not let `--init-config` create it):

1. `node scripts/hash-password.ts` → `passwordHash`, and `openssl rand -base64 32` →
   `gatewayKey`, into `/etc/orca-web/server.json`. Set `publicOrigin`/`trustProxy` behind
   Caddy and `sessionStorePath: /var/lib/orca-web/sessions.json` (hashed session keys only;
   without it every restart logs the browser out).
2. The unit the deb installs (`/lib/systemd/system/orca-web.service`) runs the binary directly
   (no Node), `User=orca-web`, hardened (`ProtectSystem=strict`, `PrivateTmp=true`). If a
   hand-rolled unit exists in `/etc/systemd/system` it shadows the packaged one — delete that
   copy when moving to the deb.

3. Caddy (TLS + WebSocket upgrade are automatic):

```
orca.example.com {
	reverse_proxy 127.0.0.1:8788
}
```

The server binds loopback only; Caddy terminates TLS. `X-Forwarded-For` feeds login rate
limiting because `trustProxy` is on. The bootstrap scripts add this site block for you when
missing.

## Home machine, fresh

`powershell -File scripts/bootstrap-gateway.ps1 -FromRelease` — downloads the standalone exe
into `%APPDATA%\orca-web`, writes the Startup-folder vbs, restarts any in-flight gateway
process, opens the admin page: `http://127.0.0.1:8790`. Everything gets wired there (hub
address, gateway key, `orca://pair?code=…`); pairing is scoped to a `mobile` device in Orca.

Without `-FromRelease` (repo checkout): the script bundles from source
(`dist-server\orca-gateway.cjs`, needs Node 24 + npm) and installs the same layout with a
`gateway-loop.cmd` that prefers the exe if present, falling back to node + `.cjs`.

Release-exe installs can skip the script for later versions: the same admin page shows the
baked build version and offers self-update (it checks the latest release, verifies the
downloaded exe's sha256, renames the running exe and lets the loop restart it). Bundle/dev
installs report `501` for that feature and keep the manual path.

The process keeps running via `gateway-loop.cmd` (restarts 10s after an exit) launched hidden
at logon with no console window — a logon trigger is deliberate: the gateway must run as the
same user as desktop Orca to reach `127.0.0.1` with its pairing material. It never listens on
a public port, so no router or firewall change is needed at home.

## Config on disk

- VPS: `/etc/orca-web/server.json` (bearer credentials — `0600`, root-owned, out of git),
  sessions in `/var/lib/orca-web/sessions.json`.
- Home: `%APPDATA%\orca-web\gateway.json`. The device token is a bearer credential: keep the
  file at `0600` and out of git; revoke the device in Orca if it leaks.
- Upgrade path: config files survive both the deb and the bootstrap scripts (generation
  happens only when the file is absent), the admin page owns later edits.

## Checks

- `curl https://orca.example.com/api/health` → `gateway.connected: true` after pairing
- log in over https; the login page is the whole auth surface (no separate admin UI on the VPS)
- rotate: change the password hash + restart; re-pair the gateway device to replace its token

## Current deployment

The live instance runs on a small Debian 13 VPS: Caddy in front, `orca-web.service` under
`/opt/orca-web`, config in `/etc/orca-web/server.json`, sessions in
`/var/lib/orca-web/sessions.json`. Hostnames and credentials are deliberately not recorded in
this repo.

No domain was bought for it. `sslip.io` resolves `<ip-with-dashes>.sslip.io` to that bare IP,
so a throwaway hostname like `203-0-113-7.sslip.io` gets a real Let's Encrypt certificate.
That matters: a self-signed or plain-HTTP origin would break `crypto.subtle` and
`crypto.randomUUID`, which the mutation envelope needs.

## See also

Bootstrap details: `scripts/bootstrap-server.sh`, `scripts/bootstrap-gateway.ps1` — both are
commented; install/checks are deliberately inlined rather than shelling out to a second layer.
Loose ends (hot swaps, one-time unit rewrites) belong to the day-to-day scripts:
`scripts/deploy-web.sh`, `scripts/deploy-server.sh`.
