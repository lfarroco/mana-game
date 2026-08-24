#!/usr/bin/env bash
# Deploy the Mana Battle multiplayer server WITHOUT Docker, on a bare
# Ubuntu cloud VM supervised by systemd.
#
# Usage: ./server/scripts/deploy-bare.sh [--build]
#
#   --build     build dist/ on the cloud VM (npm ci + tsup). Skip this when you
#               build dist/ on your dev machine and rsync it over — the
#               cloud then only installs production deps (tiny, no OOM on a
#               512 MB box). dist/ is gitignored, so git pull alone never
#               ships it.
#
# Run as root. Requirements: Node >= 22, npm, git, systemd.
# Runbook: server/README.md §Bare systemd deployment.
set -euo pipefail

BUILD=0
if [ "${1:-}" = "--build" ]; then
  BUILD=1
fi

if [ "$(id -u)" != "0" ]; then
  echo "ERROR: run as root (the script writes /etc/systemd/system and restarts the service)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_USER="${MANA_SERVICE_USER:-managame}"

cd "${REPO_ROOT}"

# 0. Toolchain guards.
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: node/npm not found. Install Node >= 22 first (NodeSource):" >&2
  echo "  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && apt-get install -y nodejs" >&2
  exit 1
fi
NODE_MAJOR="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
if [ "${NODE_MAJOR}" -lt 22 ]; then
  echo "ERROR: node ${NODE_MAJOR} is too old — the server needs >= 22 (see .nvmrc)." >&2
  exit 1
fi
if ! command -v systemctl >/dev/null 2>&1; then
  echo "ERROR: systemctl not found — this script targets a systemd host." >&2
  exit 1
fi

# 1. Fail fast if the Steam key is missing (mirrors compose.yaml's `:?` guard).
if [ ! -f .env ]; then
  echo "ERROR: no .env in ${REPO_ROOT} — create one in systemd format (bare KEY=value):" >&2
  echo "  MANA_STEAM_WEB_API_KEY=<your publisher Web API key>" >&2
  exit 1
fi
if ! grep -qE '^MANA_STEAM_WEB_API_KEY=.+' .env; then
  echo "ERROR: MANA_STEAM_WEB_API_KEY is not set in .env — POST /auth/steam would not be registered." >&2
  exit 1
fi

# 2. Pull latest from origin (ff-only so a divergent checkout fails loudly).
git pull --ff-only

# 3. Install deps + (optionally) build. Default: expect dist/ shipped from the
#    dev machine; --build compiles on the cloud VM (needs swap on 512 MB).
cd "${REPO_ROOT}/server"
if [ "${BUILD}" = "1" ]; then
  echo "[deploy-bare] building dist/ on the cloud VM ..."
  npm ci
  npm run build
else
  echo "[deploy-bare] installing production deps only ..."
  npm ci --omit=dev
fi

# 4. Writable SQLite dir for the service user.
mkdir -p data/backups
if getent passwd "${SERVICE_USER}" >/dev/null 2>&1; then
  chown -R "${SERVICE_USER}:${SERVICE_USER}" "${REPO_ROOT}/server/data"
else
  echo "ERROR: service user '${SERVICE_USER}' does not exist. Create it first:" >&2
  echo "  useradd -r -m -d ${REPO_ROOT} -s /usr/sbin/nologin ${SERVICE_USER}" >&2
  exit 1
fi

# 5. Render the systemd unit from the template ({{REPO_ROOT}}/{{SERVICE_USER}})
#    so unit changes ship with the repo, then (re)start.
sed -e "s|{{REPO_ROOT}}|${REPO_ROOT}|g" -e "s|{{SERVICE_USER}}|${SERVICE_USER}|g" \
  "${REPO_ROOT}/server/systemd/mana-server.service" > /etc/systemd/system/mana-server.service
systemctl daemon-reload
systemctl enable mana-server >/dev/null 2>&1 || true
systemctl restart mana-server

# 6. Wait for /health (honors MANA_SERVER_PORT from .env).
HOST_PORT="$(grep -E '^MANA_SERVER_PORT=' .env | tail -n1 | cut -d= -f2- || true)"
HOST_PORT="${HOST_PORT:-8787}"
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/health"
echo "[deploy-bare] waiting for ${HEALTH_URL} ..."
healthy=0
for _ in $(seq 1 30); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done
if [ "${healthy}" != "1" ]; then
  echo "ERROR: server did not become healthy within 60s." >&2
  echo "  systemctl status mana-server" >&2
  echo "  journalctl -u mana-server -n 50" >&2
  exit 1
fi

echo "[deploy-bare] server healthy at ${HEALTH_URL}"
echo "[deploy-bare] done."
