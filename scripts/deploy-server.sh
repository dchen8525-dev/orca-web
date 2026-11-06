#!/usr/bin/env bash
# Deploy server + gateway sources to the hub VPS and restart the service.
# The node-24 runtime strips types, so tsconfig.check.json is the gate, not a build step.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${ORCA_WEB_SSH:-orca-web}"

npm run tc:server

BACKUP="/opt/orca-web/src-backup-$(date +%Y%m%d%H%M%S).tgz"
ssh "$TARGET" "tar -czf '$BACKUP' apps/server/src apps/gateway/src src/shared 2>/dev/null; echo backup: '$BACKUP'"

scp -q -r apps/server/src "$TARGET":/opt/orca-web/apps/server/
scp -q -r apps/gateway/src "$TARGET":/opt/orca-web/apps/gateway/
scp -q -r src/shared "$TARGET":/opt/orca-web/src/

ssh "$TARGET" '
  systemctl restart orca-web.service
  sleep 1
  systemctl is-active orca-web.service
  curl -s --max-time 5 http://127.0.0.1:8788/api/health
'
echo
echo "server deployed to $TARGET"
