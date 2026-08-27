#!/bin/bash

# itch.io Upload Script
# =====================
# Builds the production web build and pushes it to itch.io with butler
# (https://itch.io/docs/butler) — no upload dashboard needed.
#
#   Game page: https://lfarroco.itch.io/mana-battle  ("play in browser")
#   Channel:   html5 (the browser channel — pushing to the same channel
#              UPDATES the existing upload; butler uploads only the diff)
#
# How it runs:
#   - If `butler` is on PATH, it is used directly (creds via `butler login` or
#     the BUTLER_API_KEY / MANA_BUTLER_API_KEY env vars).
#   - Otherwise, if `docker` is available, butler runs inside the tiny
#     `mana-butler` image built from butler.Dockerfile (auto-built on first
#     use — nothing is installed on the host). Docker mode requires an API
#     key: set MANA_BUTLER_API_KEY in the root .env.
#   - Force Docker even when butler is installed with ITCH_BUTLER=docker.
#   - Credentials: BUTLER_API_KEY, if already exported in the environment,
#     wins over MANA_BUTLER_API_KEY from the root .env.
#
# The root .env is read (safe parse — only the keys this script needs) so the
# web build bakes the production values (MANA_SERVER_URL, MANA_ITCH_CLIENT_ID)
# exactly like `make electron-build-*`. For this release-only script they
# default to the live production values, so the pushed build always has working
# multiplayer (a missing value would make the client point at the player's own
# machine — see docs/building-and-running.md §Building for Production).
#
# Overrides:
#   ITCH_USER_GAME     target page, default "lfarroco/mana-battle"
#   ITCH_VERSION       version tag, default = phaser/package.json version
#   ITCH_IF_CHANGED=1  pass --if-changed (skip a no-op push)
#   MANA_SKIP_CHECKS=1 skip the pre-push unit tests + typecheck
#   ITCH_BUTLER=docker force the Docker runner even when butler is installed
#   BUTLER_IMAGE       Docker image name for the runner (default mana-butler)

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
PHASER_DIR="$REPO_ROOT/phaser"

CHANNEL="html5"
USER_GAME="${ITCH_USER_GAME:-lfarroco/mana-battle}"
PAGE_URL="https://${USER_GAME%%/*}.itch.io/${USER_GAME#*/}"

# --- Read the keys we need from the root .env (safe parse) ---
# The .env file is Make-flavored, e.g. `MANA_CLOUD=-i ~/.ssh/oracle.key host` —
# a fine Make assignment but bash `source` would mis-execute the trailing words
# as commands. We only extract the vars this script uses, and values already in
# the environment win (`make itch-publish` exports the whole .env, so running
# via make also works without this loader).
load_env() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        echo "Warning: $env_file not found — falling back to production defaults."
        echo ""
        return 0
    fi
    local key val
    for key in MANA_SERVER_URL MANA_ITCH_CLIENT_ID MANA_BUTLER_API_KEY; do
        if [ -z "${!key:-}" ]; then
            val=$(grep -E "^${key}=" "$env_file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
            if [ -n "$val" ]; then
                export "$key=$val"
            fi
        fi
    done
}
load_env "$REPO_ROOT/.env"

# --- Release-build env (production defaults; .env overrides) ---
export MANA_SERVER_URL="${MANA_SERVER_URL:-https://api.manabattle.com}"
export MANA_ITCH_CLIENT_ID="${MANA_ITCH_CLIENT_ID:-f20213f3887151a962afac88d0145c57}"

# --- Credentials (BUTLER_API_KEY wins over MANA_BUTLER_API_KEY from .env) ---
export BUTLER_API_KEY="${BUTLER_API_KEY:-$MANA_BUTLER_API_KEY}"

# --- Resolve butler: host binary, or Docker fallback (nothing installed on the host) ---
BUTLER_MODE="host"
BUTLER_CMD=(butler)
PUSH_DIR="$PHASER_DIR/dist"
BUTLER_IMAGE="${BUTLER_IMAGE:-mana-butler}"

if [ "${ITCH_BUTLER:-}" != "docker" ] && command -v butler &> /dev/null; then
    BUTLER_MODE="host"
    if [ -z "$BUTLER_API_KEY" ]; then
        has_login_creds=false
        for p in "$HOME/Library/Application Support/itch/butler_creds" \
                 "$HOME/.config/itch/butler_creds"; do
            [ -f "$p" ] && has_login_creds=true
        done
        if [ "$has_login_creds" = "false" ]; then
            echo "Error: no itch.io credentials found."
            echo "Either run 'butler login' once, or set MANA_BUTLER_API_KEY in $REPO_ROOT/.env"
            echo "(API key with source \"wharf\" from https://itch.io/user/settings/api-keys)."
            exit 1
        fi
    fi
elif command -v docker &> /dev/null; then
    BUTLER_MODE="docker"
    PUSH_DIR="/data/dist"
    if [ -z "$BUTLER_API_KEY" ]; then
        echo "Error: Docker mode needs an API key — the container has no 'butler login' creds."
        echo "Set MANA_BUTLER_API_KEY in $REPO_ROOT/.env (API key with source \"wharf\""
        echo "from https://itch.io/user/settings/api-keys)."
        exit 1
    fi
    if ! docker image inspect "$BUTLER_IMAGE" &>/dev/null; then
        echo ">>> Building $BUTLER_IMAGE image (first run) ..."
        docker build -t "$BUTLER_IMAGE" -f "$SCRIPT_DIR/butler.Dockerfile" "$SCRIPT_DIR"
    fi
    BUTLER_CMD=(docker run --rm \
        -e "BUTLER_API_KEY=$BUTLER_API_KEY" \
        -v "$PHASER_DIR/dist:/data/dist:ro" \
        "$BUTLER_IMAGE")
else
    echo "Error: neither 'butler' nor 'docker' is available on this machine."
    echo "Install butler: https://itch.io/docs/butler/installing.html"
    echo "or install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "=========================================="
echo "  itch.io upload — $PAGE_URL ($CHANNEL)"
echo "=========================================="
echo ""
echo "  MANA_SERVER_URL:     $MANA_SERVER_URL"
echo "  MANA_ITCH_CLIENT_ID: ${MANA_ITCH_CLIENT_ID:0:8}..."
echo "  butler runner:       $BUTLER_MODE"
echo ""

# --- Pre-push checks (skip with MANA_SKIP_CHECKS=1) ---
if [ "${MANA_SKIP_CHECKS:-0}" != "1" ]; then
    echo ">>> Pre-push checks (npm run test:unit && npm run typecheck) ..."
    # The release-build env vars above are for the webpack build step only —
    # don't leak them into the tests (RemoteServer/steamAuth unit tests assert
    # the localhost DEFAULT_SERVER_URL fallback).
    (cd "$PHASER_DIR" && env -u MANA_SERVER_URL -u MANA_ITCH_CLIENT_ID npm run test:unit && npm run typecheck)
    echo ""
fi

# --- Build the production web build (bakes MANA_SERVER_URL / MANA_ITCH_CLIENT_ID) ---
echo ">>> Building production web build ..."
(cd "$PHASER_DIR" && npm run build)

# --- Version + notes ---
if [ -z "${ITCH_VERSION:-}" ]; then
    ITCH_VERSION=$(node -e \
        "console.log(JSON.parse(require('fs').readFileSync('$PHASER_DIR/package.json','utf8')).version)")
fi
GIT_SHA=$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")
NOTES="Mana Battle v${ITCH_VERSION} ($GIT_SHA)"

echo ""
echo ">>> Pushing phaser/dist -> $USER_GAME:$CHANNEL"
echo "    version: $ITCH_VERSION"
echo "    notes:   $NOTES"
echo ""

BUTLER_ARGS=(--userversion "$ITCH_VERSION" --notes "$NOTES")
if [ "${ITCH_IF_CHANGED:-0}" = "1" ]; then
    BUTLER_ARGS+=(--if-changed)
fi

"${BUTLER_CMD[@]}" push "$PUSH_DIR" "$USER_GAME:$CHANNEL" "${BUTLER_ARGS[@]}"

echo ""
echo "=========================================="
echo "  Upload complete! Build $ITCH_VERSION is being"
echo "  processed — it goes live on $PAGE_URL shortly."
echo "=========================================="
