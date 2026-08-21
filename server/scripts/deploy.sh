#!/usr/bin/env bash
# Deploy the Mana Battle multiplayer server on a DigitalOcean droplet.
#
# Usage: ./server/scripts/deploy.sh [--no-prune]
#
#   --no-prune   skip `docker image prune -f` after a successful deploy
#
# Requirements (runbook in server/README.md §Deployment):
#   - a clone of the repo (this script cd's to the repo root)
#   - Docker Engine + the compose plugin
#   - a root .env (gitignored) with at least MANA_STEAM_WEB_API_KEY
#
# The SQLite database lives on the named `mana-data` volume and survives
# rebuilds/restarts — only `docker compose down -v` destroys it. Back up
# before ever doing that (see server/scripts/backup.sh).
set -euo pipefail

PRUNE=1
if [ "${1:-}" = "--no-prune" ]; then
  PRUNE=0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${REPO_ROOT}"

# 0. Fail fast if the Docker daemon is unreachable (e.g. not running, or this
#    user is not in the `docker` group).
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: cannot talk to the Docker daemon — is Docker running, and is this user in the 'docker' group?" >&2
  exit 1
fi

# 1. Pull latest from origin (ff-only so a divergent checkout fails loudly
#    instead of silently merging).
git pull --ff-only

# 2. Fail fast if the Steam key is missing — mirrors compose.yaml's `:?` guard
#    but fails before the (slow) build starts. grep, not source: .env values
#    are never interpreted as shell.
if [ ! -f .env ]; then
  echo "ERROR: no .env in ${REPO_ROOT} — create one first:" >&2
  echo "  echo 'MANA_STEAM_WEB_API_KEY=<your publisher Web API key>' > .env" >&2
  exit 1
fi
if ! grep -qE '^MANA_STEAM_WEB_API_KEY=.+' .env; then
  echo "ERROR: MANA_STEAM_WEB_API_KEY is not set in .env — POST /auth/steam would not be registered." >&2
  exit 1
fi

# 3. Build + (re)start. The named `mana-data` volume persists across rebuilds;
#    only `down -v` / `volume rm` destroys it.
docker compose up -d --build

# 4. Wait for the health endpoint (honors a custom host port via
#    MANA_SERVER_PORT in .env).
HOST_PORT="$(grep -E '^MANA_SERVER_PORT=' .env | tail -n1 | cut -d= -f2- || true)"
HOST_PORT="${HOST_PORT:-8787}"
HEALTH_URL="http://127.0.0.1:${HOST_PORT}/health"
echo "[deploy] waiting for ${HEALTH_URL} ..."
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
  echo "  docker compose ps" >&2
  echo "  docker compose logs --tail=100 server" >&2
  exit 1
fi
echo "[deploy] server healthy at ${HEALTH_URL}"

# 5. Optional: drop dangling build layers once the new image is live.
if [ "${PRUNE}" = "1" ]; then
  docker image prune -f
fi

echo "[deploy] done."
