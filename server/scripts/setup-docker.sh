#!/usr/bin/env bash
# One-shot bootstrap for a FRESH Ubuntu VM running the Docker deployment
# (compose.yaml: server + caddy). Provider-agnostic — works on DigitalOcean,
# Oracle Cloud, Hetzner, Vultr, etc. This is the Docker-flow equivalent of
# setup-bare.sh (which targets the bare systemd install instead).
#
# Usage: ./server/scripts/setup-docker.sh [--domain api.manabattle.com] [--no-firewall] [--repo <git-url>]
#
#   --domain        TLS domain for Caddy (default api.manabattle.com; also read
#                   from MANA_API_DOMAIN in .env if set there)
#   --no-firewall   skip ufw configuration (e.g. when using a cloud security
#                   list / firewall — Oracle OCI, DO Cloud Firewall, ...)
#   --repo <url>    clone the repo if it isn't already at REPO_ROOT (default
#                   /opt/mana-game). Needs an SSH deploy key or PAT — the
#                   repo is private.
#
# Checks the VM and installs whatever is missing, idempotently:
#   - system packages: curl, ca-certificates
#   - Docker Engine + the compose v2 plugin (docker.com's get.docker.com script)
#   - the repo at REPO_ROOT (cloned via --repo if absent)
#   - a root .env (from .env.example) when missing — fill it in and re-run
#   - ufw firewall (22/80/443), enabled when inactive
#   - the first deploy (deploy.sh: docker compose up -d --build + /health wait)
#
# Run as root. A DNS record must already point at the VM; for HTTPS, also
# follow the Cloudflare "Full (strict)" steps in server/README.md §Docker flow.
set -euo pipefail

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: run as root (installs Docker, writes /opt, configures ufw)." >&2
  exit 1
fi

DOMAIN="api.manabattle.com"
FIREWALL=1
REPO_URL=""
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
    --repo)
      REPO_URL="${2:-}"
      shift 2
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# When run from inside a clone, use that clone; otherwise default to /opt/mana-game.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$(cd "${SCRIPT_DIR}/../.." && pwd)/.git" ]; then
  REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
else
  REPO_ROOT="/opt/mana-game"
fi

echo "[setup] Docker-flow bootstrap for ${DOMAIN} (repo: ${REPO_ROOT})"

# 1. System packages (idempotent — apt no-ops when already installed).
ensure_apt_pkgs() {
  apt-get install -y "$@" 2>/dev/null || {
    apt-get update
    apt-get install -y "$@"
  }
}
echo "[setup] ensuring curl, ca-certificates ..."
ensure_apt_pkgs curl ca-certificates

# 2. Docker Engine + the compose v2 plugin (official convenience script).
if ! docker info >/dev/null 2>&1; then
  echo "[setup] installing Docker Engine + compose plugin (get.docker.com) ..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "[setup] docker present: $(docker --version)"
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: the Docker Compose v2 plugin is not installed." >&2
  echo "  get.docker.com installs it; otherwise: apt-get install -y docker-compose-plugin" >&2
  exit 1
fi
echo "[setup] compose plugin: $(docker compose version | head -1)"

# 3. Repo — clone on first run when absent.
if [ ! -d "${REPO_ROOT}/.git" ]; then
  if [ -z "${REPO_URL}" ]; then
    echo "ERROR: no repo at ${REPO_ROOT} — pass --repo <git-url> to clone it." >&2
    echo "  Example: ./server/scripts/setup-docker.sh --repo git@github.com:lfarroco/mana-game.git" >&2
    exit 1
  fi
  mkdir -p "$(dirname "${REPO_ROOT}")"
  echo "[setup] cloning ${REPO_URL} -> ${REPO_ROOT} ..."
  git clone "${REPO_URL}" "${REPO_ROOT}"
else
  echo "[setup] repo present at ${REPO_ROOT}"
fi
cd "${REPO_ROOT}"

# 4. .env — create from the committed example, then require the Steam key.
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo "=== created ${REPO_ROOT}/.env from .env.example ===" >&2
  echo "Fill in MANA_STEAM_WEB_API_KEY (and any overrides), then re-run:" >&2
  echo "  nano ${REPO_ROOT}/.env && ./server/scripts/setup-docker.sh ${INVOCATION}" >&2
  exit 1
fi
if ! grep -qE '^MANA_STEAM_WEB_API_KEY=.+' .env; then
  echo "ERROR: MANA_STEAM_WEB_API_KEY is not set in ${REPO_ROOT}/.env — set it, then re-run." >&2
  exit 1
fi
echo "[setup] .env present with MANA_STEAM_WEB_API_KEY"

# 5. Domain override from .env (MANA_API_DOMAIN) — feeds Caddy via compose.
ENV_DOMAIN="$(grep -E '^MANA_API_DOMAIN=' .env | tail -n1 | cut -d= -f2- || true)"
if [ -n "${ENV_DOMAIN}" ]; then
  DOMAIN="${ENV_DOMAIN}"
fi
echo "[setup] TLS domain: ${DOMAIN}"

# 6. Firewall: SSH + HTTP(S). Skip with --no-firewall (cloud security list).
if [ "${FIREWALL}" = "1" ] && command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  if ! ufw status | grep -q 'Status: active'; then
    ufw --force enable
  fi
  echo "[setup] ufw active — $(ufw status | sed -n '1,5p' | tr '\n' ' ')"
else
  echo "[setup] ufw skipped/not present — open 22/80/443 in the cloud security list instead"
fi

# 7. First deploy: compose build + start + /health wait.
echo "[setup] running first deploy ..."
exec ./server/scripts/deploy.sh
