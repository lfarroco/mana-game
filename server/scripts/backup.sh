#!/usr/bin/env bash
# Online, crash-consistent backup of the Dockerized Mana Battle SQLite DB.
#
# Usage: ./server/scripts/backup.sh [--keep N]
#
#   --keep N    keep the N newest host-side snapshots (default 14)
#
# How it works:
#   1. `docker compose exec` a tiny Node one-liner into the running `server`
#      container that uses better-sqlite3's online backup API — safe under
#      WAL mode, no downtime, consistent even while requests are in flight.
#   2. Copies the snapshot out of the named volume to server/data/backups/ on
#      the host (gitignored), so it survives even `docker compose down -v`.
#   3. Prunes old snapshots; optionally copies the directory off-box when
#      BACKUP_DEST is set (uses rclone if installed).
#
# Requirements: run on the cloud VM from a repo clone; the server container
# must be running.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

KEEP=14
if [ "${1:-}" = "--keep" ]; then
  KEEP="${2:-14}"
fi

# MANA_SQLITE_PATH matches compose.yaml (volume mount /data/mana.db).
SQLITE_PATH="${MANA_SQLITE_PATH:-/data/mana.db}"
IN_CONTAINER_BACKUP_DIR="/data/backups"
HOST_BACKUP_DIR="${REPO_ROOT}/server/data/backups"

TS="$(date +%Y%m%d-%H%M%S)"
FILENAME="mana-${TS}.db"
CONTAINER_BACKUP="${IN_CONTAINER_BACKUP_DIR}/${FILENAME}"
HOST_BACKUP="${HOST_BACKUP_DIR}/${FILENAME}"

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
  .then(() => { db.close(); console.log("[backup] container snapshot:", dest); })
  .catch((err) => { db.close(); console.error("[backup] failed:", err); process.exit(1); });
JS

cd "${REPO_ROOT}"

# The server service must be up to exec into.
if ! docker compose ps --status running --services | grep -qx 'server'; then
  echo "ERROR: the 'server' service is not running — start it first:" >&2
  echo "  docker compose up -d --build" >&2
  exit 1
fi

echo "[backup] taking online snapshot of ${SQLITE_PATH} ..."
docker compose exec -T server node -e "${BACKUP_EVAL}" -- "${SQLITE_PATH}" "${CONTAINER_BACKUP}"

mkdir -p "${HOST_BACKUP_DIR}"
docker compose cp "server:${CONTAINER_BACKUP}" "${HOST_BACKUP}"
echo "[backup] host copy: ${HOST_BACKUP}"

# Prune old host-side snapshots (timestamp names sort lexically).
prune_old() {
  local keep="$1"
  shopt -s nullglob
  local files=( "${HOST_BACKUP_DIR}"/mana-*.db )
  shopt -u nullglob
  local count="${#files[@]}"
  if [ "${count}" -le "${keep}" ]; then
    return 0
  fi
  local drop
  drop="$(printf '%s\n' "${files[@]}" | sort | head -n "$(( count - keep ))")"
  printf '%s\n' "${drop}" | while IFS= read -r f; do
    rm -f "${f}"
    echo "[backup] pruned: ${f}"
  done
}
prune_old "${KEEP}"

# Optional off-box copy (e.g. an rclone remote pointing at DO Spaces).
if [ -n "${BACKUP_DEST:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "${HOST_BACKUP_DIR}" "${BACKUP_DEST}"
    echo "[backup] copied to BACKUP_DEST: ${BACKUP_DEST}"
  else
    echo "[backup] WARNING: BACKUP_DEST is set but rclone is not installed — skipping off-box copy." >&2
  fi
fi

# Drop the in-container snapshot now that a host copy exists. (It lives on the
# same volume as the DB, so `down -v` would remove it anyway — that is exactly
# why the host copy matters.) Non-fatal: keep the snapshot if the copy failed.
docker compose exec -T server sh -c "rm -f '${CONTAINER_BACKUP}'" || true

echo "[backup] done."
