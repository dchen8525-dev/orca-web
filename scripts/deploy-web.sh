#!/usr/bin/env bash
# Deploy the built web app to the hub VPS: typecheck, build, upload, atomic swap,
# verify the live tree contains the assets index.html just started referencing.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${ORCA_WEB_SSH:-orca-web}"

npm run tc
npm run web:build

CSS=$(sed -n 's/.*\(assets\/index-[A-Za-z0-9_-]*\.css\).*/\1/p' apps/web/dist/index.html | head -1)
JS=$(sed -n 's/.*\(assets\/index-[A-Za-z0-9_-]*\.js\).*/\1/p' apps/web/dist/index.html | head -1)
echo "building/verify hash: $CSS $JS"

tar -czf /tmp/orca-web-dist.tgz -C apps/web dist
scp -q /tmp/orca-web-dist.tgz "$TARGET":/tmp/
ssh "$TARGET" '
  set -e
  cd /opt/orca-web/apps/web
  [ -d dist ] && mv dist "dist.bak-$(date +%Y%m%d%H%M%S)"
  mkdir dist
  tar -xzf /tmp/orca-web-dist.tgz -C .
  rm /tmp/orca-web-dist.tgz
'
rm -f /tmp/orca-web-dist.tgz

REMOTE_ASSETS=$(ssh "$TARGET" 'ls /opt/orca-web/apps/web/dist/assets')
for asset in "$CSS" "$JS"; do
  base="${asset#assets/}"
  echo "$REMOTE_ASSETS" | grep -qx "$base" || {
    echo "deploy check failed: $base not on the server"
    exit 1
  }
done
echo "web deployed to $TARGET"
