#!/usr/bin/env bash
# Nightly database backup: custom-format pg_dump into ~/backups/nightly,
# keeping the newest 14. Restore with: pg_restore --clean --no-owner -d <url> <file>
set -euo pipefail
ENV_FILE="${FAZAM_ENV:-$HOME/apps/fazm/.env}"
DIR="$HOME/backups/nightly"
mkdir -p "$DIR" && chmod 700 "$DIR"
URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d "\"'" | sed 's/?.*//')"
F="$DIR/fazam-$(date +%Y%m%d-%H%M).dump"
pg_dump --format=custom --no-owner --dbname="$URL" --file="$F.part" && mv "$F.part" "$F" && chmod 600 "$F"
ls -1t "$DIR"/fazam-*.dump | tail -n +15 | xargs -r rm -f
echo "$(date '+%F %T') backup $(du -h "$F" | cut -f1) $F" >> "$HOME/logs/cron.log"
