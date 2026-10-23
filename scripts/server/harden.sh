#!/usr/bin/env bash
# Server hardening for the Fazam VPS (AlmaLinux 8). Run as:  sudo bash harden.sh
#
#   5. firewall: only SSH, HTTP and HTTPS reach the server
#   4. automatic security updates (dnf-automatic, security patches only)
#   3. nginx 1.14 -> 1.24 (AlmaLinux module stream), config kept, rolled back if it fails
#   2. fail2ban: bans addresses that keep failing SSH logins or probing for scanner routes
#   1. SSH: keys only, no passwords, no root login (done last)
#
# Run one step with:  sudo bash harden.sh 3
# Everything it changes is copied first to /root/hardening-<date>/ (see UNDO at the end).
set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "Run with sudo: sudo bash $0"; exit 1; }
ADMIN="${SUDO_USER:-gklelei}"
SITE="www.system.fazamfootball.org"
STAMP="$(date +%Y%m%d-%H%M)"
BACKUP="/root/hardening-$STAMP"
mkdir -p "$BACKUP"
exec > >(tee -a "$BACKUP/run.log") 2>&1

say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
warn() { printf '  ! %s\n' "$*"; }

site_up() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$SITE:443:127.0.0.1" "https://$SITE/sign-in"; }

# ---------------------------------------------------------------- 5. firewall
step5() {
  say "5. Firewall: only SSH, HTTP and HTTPS"
  systemctl is-active --quiet firewalld || { systemctl enable --now firewalld; ok "firewalld started"; }
  local zone; zone="$(firewall-cmd --get-default-zone)"
  firewall-cmd --list-all --zone="$zone" > "$BACKUP/firewall-before.txt"
  for svc in ssh http https; do
    firewall-cmd --permanent --zone="$zone" --query-service="$svc" >/dev/null || { firewall-cmd --permanent --zone="$zone" --add-service="$svc" >/dev/null; ok "allowed $svc"; }
  done
  # Nothing listens for these; close them if they're open
  for svc in cockpit; do
    firewall-cmd --permanent --zone="$zone" --query-service="$svc" >/dev/null 2>&1 && { firewall-cmd --permanent --zone="$zone" --remove-service="$svc" >/dev/null; ok "closed $svc"; }
  done
  firewall-cmd --reload >/dev/null
  local other; other="$(firewall-cmd --zone="$zone" --list-services | tr ' ' '\n' | grep -vxE 'ssh|http|https|dhcpv6-client' | tr '\n' ' ' || true)"
  local ports; ports="$(firewall-cmd --zone="$zone" --list-ports)"
  [ -z "$other$ports" ] && ok "open: ssh, http, https (zone $zone)" || warn "also open, check if still needed: ${other}${ports}"
}

# ---------------------------------------------------------------- 4. automatic security updates
step4() {
  say "4. Automatic security updates"
  dnf install -y -q dnf-automatic
  cp -a /etc/dnf/automatic.conf "$BACKUP/"
  sed -i -E 's/^upgrade_type\s*=.*/upgrade_type = security/; s/^apply_updates\s*=.*/apply_updates = yes/' /etc/dnf/automatic.conf
  systemctl enable --now dnf-automatic.timer >/dev/null
  ok "security updates install daily (kernel updates still need a reboot you choose)"
}

# ---------------------------------------------------------------- 3. nginx 1.24
step3() {
  say "3. nginx upgrade"
  local before; before="$(nginx -v 2>&1 | sed 's#.*/##')"
  if [[ "$before" == 1.24* ]]; then ok "already nginx $before"; return; fi
  dnf module list nginx -q 2>/dev/null | grep -q '1.24' || { warn "nginx 1.24 isn't offered here; skipped"; return; }
  tar -C / -czf "$BACKUP/nginx-etc.tgz" etc/nginx
  dnf module reset -y -q nginx
  dnf module enable -y -q nginx:1.24
  dnf distro-sync -y -q 'nginx*'
  if nginx -t 2>"$BACKUP/nginx-t.txt" && systemctl restart nginx && sleep 2 && [ "$(site_up)" = 200 ]; then
    ok "nginx $before -> $(nginx -v 2>&1 | sed 's#.*/##'), site answers 200"
  else
    warn "new nginx failed (see $BACKUP/nginx-t.txt); going back to $before"
    dnf module reset -y -q nginx
    dnf module enable -y -q "nginx:${before%.*}" || true
    dnf distro-sync -y -q 'nginx*'
    tar -C / -xzf "$BACKUP/nginx-etc.tgz"
    nginx -t && systemctl restart nginx
    warn "back on $(nginx -v 2>&1 | sed 's#.*/##'), site answers $(site_up)"
  fi
}

# ---------------------------------------------------------------- 2. fail2ban
step2() {
  say "2. fail2ban"
  rpm -q epel-release >/dev/null || dnf install -y -q epel-release
  dnf install -y -q fail2ban fail2ban-firewalld
  [ -f /etc/fail2ban/jail.local ] && cp -a /etc/fail2ban/jail.local "$BACKUP/"
  cat > /etc/fail2ban/jail.local <<'EOF'
# Fazam VPS (written by harden.sh)
[DEFAULT]
bantime  = 1h
bantime.increment = true
bantime.maxtime = 1w
findtime = 10m
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

# Failed SSH logins
[sshd]
enabled = true
backend = systemd

# Addresses that keep hitting the per-IP rate limit. Off: offices and mobile
# data share one address, so this banned real users (see nginx-limits.sh)
[nginx-limit-req]
enabled  = false
logpath  = /var/log/nginx/error.log
maxretry = 20

# Scanners probing for WordPress, phpMyAdmin, .env and the like
# (the site config drops those requests with 444; see the filter below)
[nginx-scanners]
enabled  = true
filter   = nginx-scanners
logpath  = /var/log/nginx/access.log
maxretry = 3
EOF
  cat > /etc/fail2ban/filter.d/nginx-scanners.conf <<'EOF'
# Requests the site config drops with "return 444" (scanner routes)
[Definition]
failregex = ^<HOST> \S+ \S+ \[\] "[^"]*" 444\b
ignoreregex =
EOF
  ok "scanner rule check on today's log: $(fail2ban-regex /var/log/nginx/access.log /etc/fail2ban/filter.d/nginx-scanners.conf 2>/dev/null | grep -m1 '^Lines:' || echo 'not run')"
  systemctl enable --now fail2ban >/dev/null
  systemctl restart fail2ban
  sleep 2
  fail2ban-client status | sed 's/^/  /'
}

# ---------------------------------------------------------------- 1. SSH keys only
step1() {
  say "1. SSH: keys only"
  local keys="/home/$ADMIN/.ssh/authorized_keys"
  [ -s "$keys" ] || { warn "$keys is empty: adding no key would lock you out. Skipped."; return; }
  ok "$(grep -cE '^(ssh-|ecdsa-|sk-)' "$keys") key(s) can sign in as $ADMIN"
  cp -a /etc/ssh/sshd_config "$BACKUP/"
  # Our settings at the top (sshd keeps the first value it reads, and the top is outside any Match block)
  local block
  block="# --- harden.sh $STAMP ---
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 30
# --- end harden.sh ---"
  sed -i '/^# --- harden.sh /,/^# --- end harden.sh ---/d' /etc/ssh/sshd_config
  printf '%s\n%s\n' "$block" "$(cat /etc/ssh/sshd_config)" > /etc/ssh/sshd_config.new
  chmod 600 /etc/ssh/sshd_config.new
  if sshd -t -f /etc/ssh/sshd_config.new; then
    mv /etc/ssh/sshd_config.new /etc/ssh/sshd_config
    systemctl reload sshd
    ok "passwords and root login are off; this session stays open"
    warn "BEFORE closing this window: open a NEW terminal and run  ssh $ADMIN@<server>  - it must get in."
    warn "If it doesn't: here, run  sudo cp $BACKUP/sshd_config /etc/ssh/ && sudo systemctl reload sshd"
  else
    rm -f /etc/ssh/sshd_config.new
    warn "the new SSH config didn't validate; nothing changed"
  fi
}

STEPS="${1:-5 4 3 2 1}"
for s in $STEPS; do "step$s"; done

say "Done. Backups and log: $BACKUP"
cat <<EOF
UNDO, if ever needed:
  SSH:       sudo cp $BACKUP/sshd_config /etc/ssh/ && sudo systemctl reload sshd
  fail2ban:  sudo systemctl disable --now fail2ban
  nginx:     sudo dnf module reset -y nginx && sudo dnf module enable -y nginx:1.14 && sudo dnf distro-sync -y 'nginx*' \\
             && sudo tar -C / -xzf $BACKUP/nginx-etc.tgz && sudo systemctl restart nginx
  updates:   sudo systemctl disable --now dnf-automatic.timer
  firewall:  compare with $BACKUP/firewall-before.txt
EOF
