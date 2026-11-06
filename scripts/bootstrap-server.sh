#!/usr/bin/env bash
# One-shot VPS initialization for the hub. Run from the dev machine:
#   bash scripts/bootstrap-server.sh [ssh-target] [domain]
# Installs (or upgrades): bundled server, web dist, systemd unit, config with a freshly
# generated gateway key plus one-time admin password, Caddy site. Existing config kept.
# Home-side pairing is NOT part of this — paste the printed gatewayKey into the
# gateway admin page (see scripts/bootstrap-gateway.ps1).
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-${ORCA_WEB_SSH:-orca-web}}"
DOMAIN="${2:-}"

if [ "${1:-}" = "" ] && [ "${2:-}" = "" ]; then
  read -rp "ssh 目标 [$TARGET]: " _t
  TARGET="${_t:-$TARGET}"
  read -rp "域名（如 8-8-8-8.sslip.io）: " DOMAIN
fi
[ -n "$DOMAIN" ] || { echo "域名是必需的：bootstrap-server.sh <ssh-target> <domain>"; exit 1; }

npm run tc
npm run release

PASSWORD=$(openssl rand -hex 6)
HASH=$(node scripts/hash-password.ts "$PASSWORD" | tail -1)

rm -rf /tmp/orca-release && mkdir /tmp/orca-release
cp dist-server/orca-server.cjs /tmp/orca-release/
rm -rf /tmp/orca-release/dist
cp -r apps/web/dist /tmp/orca-release/dist
tar -czf /tmp/orca-web-release.tgz -C /tmp/orca-release .
rm -rf /tmp/orca-release
scp -q /tmp/orca-web-release.tgz "$TARGET":/tmp/

ssh "$TARGET" bash -s -- "$DOMAIN" "$HASH" <<'REMOTE'
set -e
DOMAIN="$1"
HASH="$2"
mkdir -p /opt/orca-web/dist-server /var/lib/orca-web /etc/orca-web

if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 24 ]; then
  echo "node >= 24 missing; install it first (https://nodejs.org/en/download), then re-run"
  exit 1
fi

cd /opt/orca-web
tar -xzf /tmp/orca-web-release.tgz -C .
rm -f /tmp/orca-web-release.tgz
mv orca-server.cjs dist-server/orca-server.cjs
if [ -d dist ]; then
  if [ -d apps/web/dist ]; then
    mv apps/web/dist "apps/web/dist.bak-$(date +%Y%m%d%H%M%S)"
  fi
  mv dist apps/web/dist
fi

if [ ! -f /etc/orca-web/server.json ]; then
  KEY=$(openssl rand -base64 32 | tr -d '\n')
  printf '{"passwordHash":"%s","gatewayKey":"%s","publicOrigin":"https://%s","trustProxy":true,"staticDir":"apps/web/dist","sessionStorePath":"/var/lib/orca-web/sessions.json"}\n' \
    "$HASH" "$KEY" "$DOMAIN" > /etc/orca-web/server.json
  chmod 600 /etc/orca-web/server.json
  echo "gateway key (paste into the gateway admin page): $KEY"
else
  echo "keeping existing /etc/orca-web/server.json"
fi

cat > /etc/systemd/system/orca-web.service <<'UNIT'
[Unit]
Description=orca-web hub
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=orca-web
Group=orca-web
WorkingDirectory=/opt/orca-web
ExecStart=/usr/bin/env node /opt/orca-web/dist-server/orca-server.cjs
Restart=always
RestartSec=2
Environment=ORCA_WEB_SERVER_CONFIG=/etc/orca-web/server.json
StateDirectory=orca-web
ReadWritePaths=/var/lib/orca-web
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
UNIT

if ! id orca-web >/dev/null 2>&1; then
  useradd --system --home-dir /opt/orca-web --no-create-home orca-web
fi
chown -R orca-web:orca-web /opt/orca-web/dist-server /opt/orca-web/apps/web/dist /var/lib/orca-web
systemctl daemon-reload
systemctl enable --now orca-web.service
systemctl restart orca-web.service

if command -v caddy >/dev/null; then
  cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:8788
}
CADDY
  systemctl reload caddy
  echo "caddy site written for $DOMAIN"
else
  echo "caddy 不在：先安装 caddy，或自配反代到 127.0.0.1:8788"
fi

systemctl is-active orca-web.service
curl -s --max-time 5 http://127.0.0.1:8788/api/health
REMOTE

echo
echo "━━━ bootstrap done ━━━"
echo "登录密码（只显示这一次）: $PASSWORD"
echo "验证: https://$DOMAIN/api/health"
