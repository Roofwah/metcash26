#!/usr/bin/env sh
# Copy hub + WW26 from dble-platform monorepo into this Render deploy repo.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MONO="$(cd "$ROOT/../dble-platform" && pwd)"
rsync -a --exclude node_modules --exclude 'frontend/build' --exclude .env \
  "$MONO/platform/" "$ROOT/platform/"
rsync -a "$MONO/packages/channel-registry/" "$ROOT/packages/channel-registry/"
rsync -a --exclude node_modules --exclude 'frontend/build' --exclude .env \
  "$MONO/channels/ww26/" "$ROOT/ww26/"
echo "Synced platform + ww26 from $MONO"
