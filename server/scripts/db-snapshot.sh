#!/usr/bin/env bash
# Crash-consistent snapshot of the Dockerized server's SQLite DB.
#
# Usage: ./server/scripts/db-snapshot.sh [OUTFILE]
#   OUTFILE   host path for the snapshot (default
#             server/data/backups/mana-<ts>.db)
#
# Uses better-sqlite3's online backup API inside the running compose `server`
# container — safe under WAL, no downtime (same mechanism as backup.sh, minus
# the pruning/off-box copy). Requires the compose stack to be up; used by
# `make server-db` / `make server-db-summary` to browse the volume DB.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TS="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-${REPO_ROOT}/server/data/backups/mana-${TS}.db}"
IN_CONTAINER_BACKUP="/data/backups/mana-snapshot-${TS}.db"

cd "${REPO_ROOT}"
if ! docker compose ps --status running --services 2>/dev/null | grep -qx 'server'; then
  echo "ERROR: the compose 'server' service is not running — start it first:" >&2
  echo "  docker compose up -d --build" >&2
  exit 1
fi

# better-sqlite3 online backup API. node -e evaluates as CommonJS even though
# server/package.json is "type": "module". argv[1]/argv[2] come after the `--`.
read -r -d '' BACKUP_EVAL <<'JS' || true
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const src = process.argv[1];
const dest = process.argv[2];
fs.mkdirSync(path.dirname(dest), { recursive: true });
const db = new Database(src, { readonly: true });
db.backup(dest)
  .then(() => { db.close(); })
  .catch((err) => { db.close(); console.error("[db-snapshot] failed:", err); process.exit(1); });
JS

docker compose exec -T server node -e "${BACKUP_EVAL}" -- /data/mana.db "${IN_CONTAINER_BACKUP}"
mkdir -p "$(dirname "${OUT}")"
docker compose cp "server:${IN_CONTAINER_BACKUP}" "${OUT}" >/dev/null
docker compose exec -T server rm -f "${IN_CONTAINER_BACKUP}" >/dev/null || true
echo "${OUT}"
