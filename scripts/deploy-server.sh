#!/usr/bin/env bash
# Deploy the hub server as a single bundled file: typecheck, bundle, upload, restart.
# The no-install layout: the VPS runs /opt/orca-web/dist-server/orca-server.cjs;
# only node (>=24), the config and the static dir are needed — not node_modules.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${ORCA_WEB_SSH:-orca-web}"

npm run tc
npm run bundle

ssh "$TARGET" 'mkdir -p /opt/orca-web/dist-server'
scp -q dist-server/orca-server.cjs "$TARGET":/opt/orca-web/dist-server/

# Upgrade path: units pointing at the old source layout keep a stale ExecStart.
ssh "$TARGET" '
  set -e
  UNIT=/etc/systemd/system/orca-web.service
  if grep -q "apps/server/src/main.ts" "$UNIT"; then
    sed -i "s|ExecStart=.*|ExecStart=/usr/bin/env node /opt/orca-web/dist-server/orca-server.cjs|" "$UNIT"
    systemctl daemon-reload
    echo "unit moved to bundle layout"
  fi
  systemctl restart orca-web.service
  sleep 1
  systemctl is-active orca-web.service
  curl -s --max-time 5 http://127.0.0.1:8788/api/health
'
echo
echo "server deployed to $TARGET"
