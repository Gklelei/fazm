#!/usr/bin/env bash
# Runs one scheduled job on the live app:  run-job.sh <job-name> [dryRun]
# Reads CRON_SECRET from the live .env so the secret never sits in crontab.
set -uo pipefail
JOB="$1"
ENV_FILE="${FAZAM_ENV:-$HOME/apps/fazm/.env}"
LOG="$HOME/logs/cron.log"
mkdir -p "$(dirname "$LOG")"

SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d "\"'")"
QS=""; [ "${2:-}" = "dryRun" ] && QS="?dryRun=1"

RESP="$(curl -sS --max-time 300 -X POST -w ' http=%{http_code}' \
  -H "Authorization: Bearer $SECRET" "http://127.0.0.1:3000/api/cron-jobs/$JOB$QS" 2>&1)"
echo "$(date '+%F %T') $JOB $RESP" >> "$LOG"
case "$RESP" in *"http=200"*) exit 0 ;; *) exit 1 ;; esac
