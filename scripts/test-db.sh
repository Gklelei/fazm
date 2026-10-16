#!/usr/bin/env bash
# (Re)create the local integration-test database: <your db>_test, migrated like production.
# Uses DATABASE_URL from .env; never touches that database itself.
set -euo pipefail
cd "$(dirname "$0")/.."
URL=$(grep -E '^DATABASE_URL=' .env | sed -E 's/^DATABASE_URL="?//; s/"$//; s/\?.*//')
DB=${URL##*/}
TEST_URL="${URL%/*}/${DB}_test"
psql "${URL%/*}/postgres" -qc "DROP DATABASE IF EXISTS \"${DB}_test\"" -c "CREATE DATABASE \"${DB}_test\""
DATABASE_URL="$TEST_URL" npx prisma migrate deploy
echo "Ready: ${DB}_test"
