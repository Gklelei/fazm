#!/usr/bin/env bash
# Build locally and deploy to the production server, which has too little RAM
# to run `next build` itself. Usage:  scripts/deploy.sh
#
# 1. builds a standalone bundle here, using production's NEXT_PUBLIC_* values
# 2. uploads it to ~/apps/fazm-releases/<timestamp> (previous releases kept)
# 3. starts it on a spare port and checks it before touching the live app
# 4. switches PM2 `sys_fazam` to it and saves the PM2 process list
# Rollback: point PM2 at an older release folder the same way.
#
# Back up the database first if the release changes data or schema.
set -euo pipefail

SERVER="${DEPLOY_SERVER:-gklelei@158.69.36.39}"
LIVE_ENV='~/apps/fazm/.env'          # production settings stay on the server
SSH="ssh -o BatchMode=yes"
REL="$(date +%Y%m%d-%H%M)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "▶ Building (public settings taken from the server's .env)"
PUBLIC_ENV="$($SSH "$SERVER" "grep '^NEXT_PUBLIC_' $LIVE_ENV" | tr -d '"')"
rm -rf .next/standalone
env $PUBLIC_ENV NODE_ENV=production npx next build

echo "▶ Assembling bundle"
cp -a .next/standalone/. "$OUT/"
# The tracer copies these from the repo root; they must never ship
rm -rf "$OUT"/.env* "$OUT/docs" "$OUT/graphify-out" "$OUT/docker-compose.yml"
mkdir -p "$OUT/.next" && cp -a .next/static "$OUT/.next/static"
rm -rf "$OUT/public" && cp -a public "$OUT/public" && rm -rf "$OUT/public/uploads"

echo "▶ Uploading release $REL"
$SSH "$SERVER" "mkdir -p ~/apps/fazm-releases/$REL"
rsync -az -e "$SSH" "$OUT/" "$SERVER:apps/fazm-releases/$REL/"

echo "▶ Checking the release on port 3002, then switching"
$SSH "$SERVER" bash -s "$REL" "$LIVE_ENV" <<'REMOTE'
set -euo pipefail
source ~/.nvm/nvm.sh >/dev/null
R=~/apps/fazm-releases/$1
eval cp "$2" "$R/.env" && chmod 600 "$R/.env"
mkdir -p "$R/public/uploads" && cp -a ~/apps/fazm/public/uploads/. "$R/public/uploads/" 2>/dev/null || true
cd "$R"
PORT=3002 HOSTNAME=127.0.0.1 nohup node --env-file=.env server.js >/tmp/fazam-canary.log 2>&1 &
CANARY=$!
sleep 8
ok=1
for p in /sign-in /api/health; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:3002$p")
  echo "   $p $code"; [ "$code" = 200 ] || ok=0
done
kill "$CANARY" 2>/dev/null || true
[ "$ok" = 1 ] || { echo "✗ Release failed its checks; live app untouched"; tail -20 /tmp/fazam-canary.log; exit 1; }

pm2 delete sys_fazam >/dev/null 2>&1 || true
PORT=3000 HOSTNAME=127.0.0.1 pm2 start server.js --name sys_fazam --cwd "$R" \
  --node-args='--env-file=.env --max-old-space-size=640' --max-memory-restart 700M >/dev/null
sleep 5
curl -sf -o /dev/null http://127.0.0.1:3000/api/health && echo "✓ live on $R"
pm2 save >/dev/null
# keep the three newest releases
ls -1dt ~/apps/fazm-releases/*/ | tail -n +4 | xargs -r rm -rf
REMOTE
