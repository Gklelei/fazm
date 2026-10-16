#!/usr/bin/env bash
# Nightly database backup: custom-format pg_dump into ~/backups/nightly,
# keeping the newest 14, then copies it and uploads to Google Drive.
# Restore with: pg_restore --clean --no-owner -d <url> <file>
set -euo pipefail
ENV_FILE="${FAZAM_ENV:-$HOME/apps/fazm/.env}"
DIR="$HOME/backups/nightly"
mkdir -p "$DIR" && chmod 700 "$DIR"
URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d "\"'" | sed 's/?.*//')"
F="$DIR/fazam-$(date +%Y%m%d-%H%M).dump"
pg_dump --format=custom --no-owner --dbname="$URL" --file="$F.part" && mv "$F.part" "$F" && chmod 600 "$F"
ls -1t "$DIR"/fazam-*.dump | tail -n +15 | xargs -r rm -f
echo "$(date '+%F %T') backup $(du -h "$F" | cut -f1) $F" >> "$HOME/logs/cron.log"

# Off-site copy to Google Drive (only if rclone is set up). rclone only has
# Drive's per-app "drive.file" access, so it sees just the fazam folder.
RCLONE="$HOME/bin/rclone"
UPLOADS="${UPLOAD_ROOT:-/srv/uploads}"
if [ -x "$RCLONE" ] && "$RCLONE" listremotes 2>/dev/null | grep -q '^gdrive:'; then
  status=ok
  "$RCLONE" copy "$F" gdrive:fazam/database --log-level ERROR || status=failed
  # Keep the newest 30 database backups in Drive
  "$RCLONE" lsf gdrive:fazam/database --files-only 2>/dev/null | grep '^fazam-.*\.dump$' | sort -r | tail -n +31 |
    while read -r old; do "$RCLONE" deletefile "gdrive:fazam/database/$old" --log-level ERROR; done
  # Photos and documents: only changes upload; files deleted in the app are
  # moved to uploads-deleted/<date> instead of being lost
  "$RCLONE" sync "$UPLOADS" gdrive:fazam/uploads --backup-dir "gdrive:fazam/uploads-deleted/$(date +%Y%m%d)" --log-level ERROR || status=failed
  echo "$(date '+%F %T') gdrive $status" >> "$HOME/logs/cron.log"
fi
