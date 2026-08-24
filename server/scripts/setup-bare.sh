#!/usr/bin/env bash
# One-shot bootstrap for the bare (no-Docker) cloud deployment.
#
# Usage: ./server/scripts/setup-bare.sh [--domain api.manabattle.com] [--no-firewall]
#
#   --domain        TLS domain for Caddy (default api.manabattle.com; also read
#                   from MANA_API_DOMAIN in .env if set there)
#   --no-firewall   skip ufw configuration (e.g. when using a DO Cloud Firewall)
#
# Checks the cloud and installs whatever is missing, idempotently:
#   - system packages: curl, git, ca-certificates
#   - Node >= 22 (NodeSource .deb repo when missing/too old)
#   - Caddy (official apt repo) for TLS termination 80/443 -> 127.0.0.1:8787
#   - the 'managame' service user
#   - a root .env (from .env.example) when missing — fill it in and re-run
#   - ufw firewall (22/80/443), enabled when inactive
#   - /etc/caddy/Caddyfile rendered from server/Caddyfile
#   - the systemd unit + first deploy (via deploy-bare.sh --build)
#
# Run as root, from a clone of the repo. The DNS record must already point at
# the cloud (DNS-only is fine — Caddy auto-issues Let's Encrypt certs).
set -euo pipefail

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: run as root (installs packages, writes /etc/caddy, /etc/systemd/system)." >&2
  exit 1
fi

DOMAIN="api.manabattle.com"
FIREWALL=1
INVOCATION="$*"
while [ $# -gt 0 ]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-$DOMAIN}"
      shift 2
      ;;
    --no-firewall)
      FIREWALL=0
      shift
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_USER="${MANA_SERVICE_USER:-managame}"

echo "[setup] cloud VM bootstrap for ${DOMAIN} (repo: ${REPO_ROOT})"

# 1. System packages (idempotent — apt no-ops when already installed).
ensure_apt_pkgs() {
  apt-get install -y "$@" 2>/dev/null || {
    apt-get update
    apt-get install -y "$@"
  }
}
echo "[setup] ensuring curl, git, ca-certificates ..."
ensure_apt_pkgs curl git ca-certificates

# 2. Node >= 22 (Ubuntu 24.04's apt nodejs is 18; the server needs >= 22).
NODE_MAJOR="$(node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || true)"
if [ -z "${NODE_MAJOR}" ] || [ "${NODE_MAJOR}" -lt 22 ]; then
  echo "[setup] installing Node 24 from NodeSource ..."
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  ensure_apt_pkgs nodejs
else
  echo "[setup] node v${NODE_MAJOR} present (>= 22 required) — OK"
fi

# 3. Caddy (official apt repo) — TLS reverse proxy for the web build.
if ! command -v caddy >/dev/null 2>&1; then
  echo "[setup] installing Caddy from the official apt repo ..."
  ensure_apt_pkgs debian-keyring debian-archive-keyring apt-transport-https gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' |
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' |
    tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  ensure_apt_pkgs caddy
else
  echo "[setup] caddy present: $(caddy version | head -1)"
fi

# 4. Service user (non-root process owner; matches the systemd unit).
if ! getent passwd "${SERVICE_USER}" >/dev/null 2>&1; then
  echo "[setup] creating service user '${SERVICE_USER}' ..."
  useradd -r -m -d "${REPO_ROOT}" -s /usr/sbin/nologin "${SERVICE_USER}"
else
  echo "[setup] service user '${SERVICE_USER}' present"
fi

# 5. .env — create from the committed example, then require the Steam key.
if [ ! -f "${REPO_ROOT}/.env" ]; then
  cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"
  chown root:root "${REPO_ROOT}/.env"
  chmod 600 "${REPO_ROOT}/.env"
  echo "=== created ${REPO_ROOT}/.env from .env.example ===" >&2
  echo "Fill in MANA_STEAM_WEB_API_KEY (and any other overrides), then re-run:" >&2
  echo "  nano ${REPO_ROOT}/.env && ./server/scripts/setup-bare.sh ${INVOCATION}" >&2
  exit 1
fi
if ! grep -qE '^MANA_STEAM_WEB_API_KEY=.+' "${REPO_ROOT}/.env"; then
  echo "ERROR: MANA_STEAM_WEB_API_KEY is not set in ${REPO_ROOT}/.env — set it, then re-run." >&2
  exit 1
fi
echo "[setup] .env present with MANA_STEAM_WEB_API_KEY"

# 6. Domain override from .env (MANA_API_DOMAIN), then render the Caddyfile.
ENV_DOMAIN="$(grep -E '^MANA_API_DOMAIN=' "${REPO_ROOT}/.env" | tail -n1 | cut -d= -f2- || true)"
if [ -n "${ENV_DOMAIN}" ]; then
  DOMAIN="${ENV_DOMAIN}"
fi
mkdir -p /etc/caddy
sed "s|{{MANA_API_DOMAIN}}|${DOMAIN}|g" "${REPO_ROOT}/server/Caddyfile" > /etc/caddy/Caddyfile
echo "[setup] Caddyfile rendered for ${DOMAIN} → /etc/caddy/Caddyfile"

# 7. Firewall: SSH + HTTP(S). Enabling ufw without allowing 22 first would
#    lock out — order matters. Skip with --no-firewall (DO Cloud Firewall).
if [ "${FIREWALL}" = "1" ] && command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  if ! ufw status | grep -q 'Status: active'; then
    ufw --force enable
  fi
  echo "[setup] ufw active — $(ufw status | sed -n '1,5p' | tr '\n' ' ')"
else
  echo "[setup] ufw skipped/not present — open 22/80/443 yourself if needed"
fi

# 8. (Re)load the Caddy config now that the Caddyfile is in place.
if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files | grep -q '^caddy.service'; then
  systemctl restart caddy
  echo "[setup] caddy restarted with ${DOMAIN}"
fi

# 9. First deploy: npm deps + dist build + systemd unit + health check.
echo "[setup] running first deploy ..."
exec "${REPO_ROOT}/server/scripts/deploy-bare.sh" --build
