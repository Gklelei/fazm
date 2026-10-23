#!/usr/bin/env bash
# Loosens nginx's per-address limits so people who share one internet
# connection (an office 4G router, mobile data) stop getting "429 Too Many
# Requests". Run as:  sudo bash nginx-limits.sh
#
#   - script, style, image and upload files: no request limit (they were
#     limited like pages; one page needs 20-40 of them)
#   - pages: 10 requests/second per address with a burst of 40 (was 5 and 10,
#     and it covered every file)
#   - connections per address: 60 (was 20)
#   - unchanged: sign-in (1/second) and /api/ (10/second, burst 30)
#   - fail2ban's nginx-limit-req rule (bans addresses that hit the limit) off
#
# Everything is copied first to /root/nginx-limits-<date>/; if the new
# settings fail nginx's check, the old ones are put back.
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "Run with sudo: sudo bash $0"; exit 1; }

MAIN=/etc/nginx/nginx.conf
SITE=/etc/nginx/conf.d/sys_fazam.conf
BACKUP="/root/nginx-limits-$(date +%Y%m%d-%H%M)"
mkdir -p "$BACKUP"
cp -a "$MAIN" "$SITE" "$BACKUP/"

/usr/libexec/platform-python - "$MAIN" "$SITE" <<'PY'
import re, sys
main, site = sys.argv[1], sys.argv[2]

s = open(main).read()
s, n = re.subn(r"(zone=global_limit:10m\s+rate=)5r/s", r"\g<1>10r/s", s)
print(f"  nginx.conf: page rate 5 -> 10 per second ({n} change)")
open(main, "w").write(s)

s = open(site).read()
# The limit that applied to every location of the site
s, a = re.subn(r"\n[ \t]*# GLOBAL: 5 requests per second per IP[^\n]*\n[ \t]*limit_req zone=global_limit burst=10 nodelay;\n[ \t]*limit_req_status 429;\n",
               "\n    # Pages are limited in `location /` below; files are not\n", s)
s, b = re.subn(r"limit_conn perip_conn 20;", "limit_conn perip_conn 60;", s)
# ...now only on pages
s, c = re.subn(r"(\n    location / \{\n)",
               r"\1        # Pages: 10/second per address, bursts of 40 (offices share one address)\n        limit_req zone=global_limit burst=40 nodelay;\n        limit_req_status 429;\n\n", s, count=1)
print(f"  site: site-wide limit removed ({a}), connections 20 -> 60 ({b}), page limit added ({c})")
if not (a == b == c == 1):
    sys.exit("  the site file didn't look as expected; nothing changed")
open(site, "w").write(s)
PY

if nginx -t 2>"$BACKUP/nginx-t.txt"; then
  systemctl reload nginx
  echo "  ✓ nginx reloaded with the new limits"
else
  cp -a "$BACKUP/nginx.conf" "$MAIN"; cp -a "$BACKUP/sys_fazam.conf" "$SITE"
  echo "  ! nginx rejected the change (see $BACKUP/nginx-t.txt); old settings put back"
  exit 1
fi

if [ -f /etc/fail2ban/jail.local ]; then
  sed -i '/^\[nginx-limit-req\]/,/^\[/{s/^enabled *= *true/enabled  = false/}' /etc/fail2ban/jail.local
  systemctl restart fail2ban
  echo "  ✓ fail2ban: jails now $(fail2ban-client status | sed -n 's/.*Jail list:\s*//p')"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve www.system.fazamfootball.org:443:127.0.0.1 https://www.system.fazamfootball.org/sign-in)
echo "  site answers $code"
echo "Backups: $BACKUP   Undo: sudo cp $BACKUP/nginx.conf $MAIN && sudo cp $BACKUP/sys_fazam.conf $SITE && sudo systemctl reload nginx"
