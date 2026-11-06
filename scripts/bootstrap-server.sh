#!/usr/bin/env bash
# Bring up (or upgrade) the hub on a Debian/Ubuntu VPS. Two payload sources:
#   bash scripts/bootstrap-server.sh <ssh-target> <domain>   build here (bun + npm), upload, install
#   bash scripts/bootstrap-server.sh --remote <sslip-domain> no repo needed: the VPS pulls the
#                                                           latest release deb and dpkg -i's it
# Both modes: keep an existing /etc/orca-web/server.json untouched, write the systemd unit,
# add the Caddy site if missing, then health-check https://<domain>/api/health.
# Pairing happens later on the home gateway admin page (server + gateway stay decoupled).
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="${ORCA_WEB_REPO:-https://github.com/dchen8525-dev/orca-web}"
DEB_URL="$REPO/releases/latest/download/orca-server-linux-amd64.deb"

REMOTE=0
TARGET=""
if [ "${1:-}" = "--remote" ]; then
  REMOTE=1
  TARGET="${ORCA_WEB_SSH:-orca-web}"
  DOMAIN="${2:-}"
elif [ -n "${1:-}" ]; then
  TARGET="$1"
  DOMAIN="${2:-}"
else
  TARGET="${ORCA_WEB_SSH:-orca-web}"
  read -rp "域名（如 144-34-186-164.sslip.io）: " DOMAIN
fi
[ -n "$DOMAIN" ] || { echo "域名必需：bootstrap-server.sh [--remote] <ssh-target> <domain>"; exit 1; }

# ---------- payload: local build ----------
if [ "$REMOTE" = 0 ]; then
  echo "== 本地构建（bun 交叉编译 + web 静态文件）"
  npm run tc
  npm run web:build
  PAYLOAD=/tmp/orca-bootstrap-payload
  rm -rf "$PAYLOAD" && mkdir -p "$PAYLOAD/dist-server" "$PAYLOAD/apps/web"
  bun build --compile apps/server/src/main.ts --target=bun-linux-x64 --outfile "$PAYLOAD/dist-server/orca-server"
  cp -r apps/web/dist "$PAYLOAD/apps/web/dist"
  tar -czf /tmp/orca-bootstrap.tar.gz -C "$PAYLOAD" dist-server apps
  scp /tmp/orca-bootstrap.tar.gz "$TARGET:/tmp/"
fi

# ---------- install: local upload ----------
if [ "$REMOTE" = 0 ]; then
  echo "== 远端安装"
  ssh "$TARGET" bash -s -- "$DOMAIN" <<INSTALL
set -euo pipefail
DOMAIN="\$1"
mkdir -p /opt/orca-web/dist-server /opt/orca-web/apps /etc/orca-web
id -u orca-web >/dev/null 2>&1 || adduser --system --group --home /opt/orca-web orca-web

systemctl stop orca-web.service 2>/dev/null || true
tar -xzf /tmp/orca-bootstrap.tar.gz -C /opt/orca-web
chmod 755 /opt/orca-web/dist-server/orca-server
rm -f /tmp/orca-bootstrap.tar.gz

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
ExecStart=/opt/orca-web/dist-server/orca-server --config /etc/orca-web/server.json
Restart=always
RestartSec=2
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

if [ ! -f /etc/orca-web/server.json ]; then
  /opt/orca-web/dist-server/orca-server --init-config /etc/orca-web/server.json --public-origin "https://\$DOMAIN"
  chmod 600 /etc/orca-web/server.json
fi
systemctl daemon-reload
systemctl enable --now orca-web.service
INSTALL
fi

# ---------- install: remote pulls the release deb ----------
if [ "$REMOTE" = 1 ]; then
  echo "== 远端拉取最新 release deb"
  ssh "$TARGET" bash -s -- "$DOMAIN" "$DEB_URL" <<DEBPULL
set -euo pipefail
DOMAIN="\$1"
DEB_URL="\$2"
apt-get update -qq >/dev/null 2>&1 || true
apt-get install -y -qq curl >/dev/null 2>&1 || true
mkdir -p /etc/orca-web
echo "\$DOMAIN" > /etc/orca-web/domain.txt
curl -fsSL -o /tmp/orca-server.deb "\$DEB_URL"
sha_url="\${DEB_URL}.sha256"
if curl -fsSL -o /tmp/orca-server.deb.sha256 "\$sha_url"; then
  ( cd /tmp && sha256sum -c orca-server.deb.sha256 )
fi
dpkg -i /tmp/orca-server.deb
rm -f /tmp/orca-server.deb /tmp/orca-server.deb.sha256 /etc/orca-web/domain.txt
DEBPULL
fi

# ---------- caddy site (both modes) ----------
echo "== Caddy 站点"
ssh "$TARGET" bash -s -- "$DOMAIN" <<CADDY
set -euo pipefail
if ! command -v caddy >/dev/null 2>&1; then
  echo "未安装 caddy，跳过站点配置（可按 DEPLOY.md 手动加）"
  exit 0
fi
if grep -q "^\$1 {" /etc/caddy/Caddyfile 2>/dev/null; then
  echo "caddy 站点已存在"
else
  printf '\n\$1 {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:8788\n}\n' >> /etc/caddy/Caddyfile
fi
caddy validate --config /etc/caddy/Caddyfile >/dev/null
systemctl reload caddy || systemctl restart caddy
CADDY

echo "== 健康检查"
for _ in 1 2 3 4 5; do
  if curl -fsS "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    echo "✅ https://$DOMAIN 已在服务"
    exit 0
  fi
  sleep 3
done
echo "⚠️ /api/health 暂时没通：先看 journalctl -u orca-web -n 50（若首次安装，密码已打印在上面）" >&2
exit 1
