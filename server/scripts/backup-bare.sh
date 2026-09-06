#!/usr/bin/env bash
# Online, crash-consistent backup of a local SQLite DB file (e.g. the
# `make server-mp` database at server/data/mana.db).
# Uses better-sqlite3's online backup API — safe under
# WAL mode, no downtime, consistent even while requests are in flight.
#
# Usage: ./server/scripts/backup-bare.sh [--keep N]
#
#   --keep N    keep the N newest snapshots (default 14)
#
# Snapshot lands in server/data/backups/mana-<ts>.db (gitignored). Set
# BACKUP_DEST (e.g. an rclone remote pointing at DO Spaces) for an off-box
# copy. Requires production deps installed (npm ci --omit=dev → better-sqlite3).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

KEEP=14
if [ "${1:-}" = "--keep" ]; then
  KEEP="${2:-14}"
fi

SQLITE_PATH="${MANA_SQLITE_PATH:-${REPO_ROOT}/server/data/mana.db}"
HOST_BACKUP_DIR="${REPO_ROOT}/server/data/backups"

TS="$(date +%Y%m%d-%H%M%S)"
FILENAME="mana-${TS}.db"
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
  .then(() => { db.close(); console.log("[backup-bare] snapshot:", dest); })
  .catch((err) => { db.close(); console.error("[backup-bare] failed:", err); process.exit(1); });
JS

# better-sqlite3 resolves from server/node_modules.
cd "${REPO_ROOT}/server"

if [ ! -f "${SQLITE_PATH}" ]; then
  echo "ERROR: database not found at ${SQLITE_PATH} — has the server ever run?" >&2
  exit 1
fi

echo "[backup-bare] taking online snapshot of ${SQLITE_PATH} ..."
node -e "${BACKUP_EVAL}" -- "${SQLITE_PATH}" "${HOST_BACKUP}"
echo "[backup-bare] ${HOST_BACKUP}"

# Prune old snapshots (timestamp names sort lexically).
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
    echo "[backup-bare] pruned: ${f}"
  done
}
prune_old "${KEEP}"

# Optional off-box copy (e.g. an rclone remote pointing at DO Spaces).
if [ -n "${BACKUP_DEST:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copy "${HOST_BACKUP_DIR}" "${BACKUP_DEST}"
    echo "[backup-bare] copied to BACKUP_DEST: ${BACKUP_DEST}"
  else
    echo "[backup-bare] WARNING: BACKUP_DEST is set but rclone is not installed — skipping off-box copy." >&2
  fi
fi

echo "[backup-bare] done."
