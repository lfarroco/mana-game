#!/bin/bash

# Steam Upload Script (SteamPipe)
# ===============================
# Builds the production Electron app for all platforms and pushes it to Steam
# with steamcmd — the Steamworks build pipeline, no upload dashboard needed.
#
#   Full game:  App 3757600 — depots 3757602 (win) / 3757604 (mac) / 3757603 (linux)
#   Demo:       App 4233280 — depots 4233282 (win) / 4233283 (mac) / 4233284 (linux)
#               target the demo with STEAM_DEMO=1 (`publish_steam_demo.sh` is a
#               thin wrapper that does this).
#
# How it runs:
#   - The default runner is Docker: steamcmd runs inside the official
#     `steamcmd/steamcmd:debian-12` image (pulled on first use — nothing is
#     installed on the host). Force the host `steamcmd` with STEAM_CMD=host.
#   - Auth is interactive: the script uses STEAM_USERNAME from the env / root
#     .env (not a secret, safe to store) and prompts on the TTY for the
#     password and the Steam Guard code when they aren't already exported.
#     Nothing secret is stored anywhere — no cached sessions, no tokens.
#     Non-interactive use (pipes, cron) must export STEAM_USERNAME,
#     STEAM_PASSWORD (+ STEAM_GUARD_CODE for 2FA accounts) up front.
#
# The root .env is read (safe parse — only the keys this script needs) so the
# Electron build bakes the production values (MANA_SERVER_URL) exactly like
# `make electron-build-all`. It defaults to the live production value, so the
# pushed build always has working multiplayer (a missing value would make the
# client point at the player's own machine — see docs/building-and-running.md
# §Building for Production).
#
# Overrides:
#   STEAM_DEMO=1         target the demo app (4233280) instead of the full game
#   STEAM_USERNAME       Steam account with Steamworks access. May live in the
#                        root .env (not a secret); prompted when unset.
#   STEAM_PASSWORD       account password. Export it for non-interactive use;
#                        otherwise prompted (never stored).
#   STEAM_GUARD_CODE     Steam Guard / mobile-auth code (2FA accounts). Export
#                        it or type it when prompted (Enter skips).
#   STEAM_BUILD_DESC     build description in Steamworks → Builds,
#                        default "v<version> — <date>"
#   STEAM_CMD=docker     runner; set "host" to use the machine's steamcmd
#   STEAMCMD_IMAGE       Docker image for the runner (default steamcmd/steamcmd:debian-12)
#   MANA_SKIP_CHECKS=1   skip the pre-push unit tests + typecheck
#   MANA_SKIP_BUILD=1    skip the Electron build (upload the existing dist-electron)
#   STEAM_DRY_RUN=1      print the exact steamcmd command without running it
#
# Notes:
#   - The build is NOT set live: app_build*.vdf uses `setlive ""`, so the new
#     build lands in Steamworks → <App> → Builds and you promote it from there.
#   - First login from a fresh container may print a "press Enter to continue"
#     Steam Subscriber Agreement prompt — Docker mode auto-answers it on stdin.
#   - The password is passed on the steamcmd command line (visible in `ps` while
#     running) exactly like the official SteamPipe instructions; it is only
#     ever typed at the prompt or exported for one run, never stored.

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
PHASER_DIR="$REPO_ROOT/phaser"
STEAM_CONFIG_DIR="$REPO_ROOT/steam/steam_config"

# --- Which app are we publishing? (STEAM_DEMO=1 → demo wrapper) ---
DEMO="${STEAM_DEMO:-0}"
if [ "$DEMO" = "1" ]; then
    APP_ID="4233280"
    APP_LABEL="Mana Battle Demo"
    BUILD_VDF="app_build_demo.vdf"
    GEN_VDF="app_build_demo.gen.vdf"
    BUILD_OUTPUT_DIR="$PHASER_DIR/dist-steam-demo"
    BUILD_DIR_NAME="dist-steam-demo"
else
    APP_ID="3757600"
    APP_LABEL="Mana Battle"
    BUILD_VDF="app_build.vdf"
    GEN_VDF="app_build.gen.vdf"
    BUILD_OUTPUT_DIR="$PHASER_DIR/dist-steam"
    BUILD_DIR_NAME="dist-steam"
fi

# --- Read the keys we need from the root .env (safe parse) ---
# The .env file is Make-flavored and may contain values bash would choke on
# a fine Make assignment but bash `source` would mis-execute the trailing words
# as commands. We only extract the vars this script uses, and values already in
# the environment win (`make steam-publish` exports the whole .env, so running
# via make also works without this loader).
load_env() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        echo "Warning: $env_file not found — falling back to production defaults."
        echo ""
        return 0
    fi
    local key val
    # Only non-secret keys are read from .env — STEAM_PASSWORD /
    # STEAM_GUARD_CODE must be exported in the environment or typed at the
    # prompt, so no secret ever rests in a file.
    for key in MANA_SERVER_URL STEAM_USERNAME; do
        if [ -z "${!key:-}" ]; then
            val=$(grep -E "^${key}=" "$env_file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)
            if [ -n "$val" ]; then
                export "$key=$val"
            fi
        fi
    done
}
load_env "$REPO_ROOT/.env"

# --- Release-build env (production default; .env overrides) ---
export MANA_SERVER_URL="${MANA_SERVER_URL:-https://us-central1-mana-battle-f3b15.cloudfunctions.net/api}"

# --- Build description (Steamworks → Builds; the analog of butler's --userversion) ---
if [ -z "${STEAM_BUILD_DESC:-}" ]; then
    VERSION=""
    if command -v node &> /dev/null; then
        VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$PHASER_DIR/package.json','utf8')).version)" 2>/dev/null || true)
    fi
    STEAM_BUILD_DESC="${VERSION:+v$VERSION — }$(date '+%Y-%m-%d %H:%M')"
fi
# VDF strings can't contain double quotes or backslashes — sanitize.
STEAM_BUILD_DESC=$(printf '%s' "$STEAM_BUILD_DESC" | tr -d '"\\')

# --- Runner (Docker is the default — nothing to install on the host) ---
if [ "${STEAM_CMD:-docker}" = "host" ]; then
    if ! command -v steamcmd &> /dev/null; then
        echo "Error: STEAM_CMD=host but steamcmd is not installed or not in your PATH."
        echo "Install steamcmd: https://developer.valvesoftware.com/wiki/SteamCMD"
        exit 1
    fi
    RUNNER_MODE="host"
else
    RUNNER_MODE="docker"
    if ! command -v docker &> /dev/null; then
        if command -v steamcmd &> /dev/null; then
            echo "Warning: docker not found — falling back to the host steamcmd."
            RUNNER_MODE="host"
        else
            echo "Error: neither 'docker' nor 'steamcmd' is available on this machine."
            echo "Install Docker: https://docs.docker.com/get-docker/"
            echo "or install steamcmd: https://developer.valvesoftware.com/wiki/SteamCMD"
            exit 1
        fi
    fi
fi

# --- Credentials: prompt for what isn't exported ---
# STEAM_USERNAME may come from the root .env (not a secret). The password and
# guard code are never read from .env — export them for a non-interactive run
# or type them when asked. Cached-session auth (config.vdf) is gone: if the
# old token vars are still set anywhere, say so and ignore them.
if [ -n "${STEAM_CONFIG_VDF_B64:-}" ] || [ -n "${STEAM_CONFIG_VDF:-}" ]; then
    echo "Warning: STEAM_CONFIG_VDF(_B64) is set but cached-session auth was"
    echo "removed — ignoring it. Delete that line from the root .env; you will"
    echo "be prompted for the password + Steam Guard code instead."
    echo ""
fi
if [ -z "${STEAM_USERNAME:-}" ]; then
    if [ -t 0 ]; then
        read -rp "Steam username: " STEAM_USERNAME
    else
        echo "Error: STEAM_USERNAME is not set and there is no TTY to prompt on."
        echo "Set it in $REPO_ROOT/.env or export it (the Steam account with"
        echo "Steamworks access to app $APP_ID)."
        exit 1
    fi
fi
if [ -z "${STEAM_USERNAME:-}" ]; then
    echo "Error: no Steam username given."
    exit 1
fi
if [ -z "${STEAM_PASSWORD:-}" ]; then
    if [ -t 0 ]; then
        read -rsp "Steam password: " STEAM_PASSWORD
        echo ""
    else
        echo "Error: STEAM_PASSWORD is not set and there is no TTY to prompt on."
        echo "Export STEAM_PASSWORD (+ STEAM_GUARD_CODE for 2FA accounts) and retry."
        exit 1
    fi
fi
if [ -z "${STEAM_GUARD_CODE:-}" ] && [ -t 0 ]; then
    read -rp "Steam Guard code (Enter to skip): " STEAM_GUARD_CODE
fi

LOGIN_ARGS=("$STEAM_USERNAME" "$STEAM_PASSWORD")
if [ -n "${STEAM_GUARD_CODE:-}" ]; then
    LOGIN_ARGS+=("$STEAM_GUARD_CODE")
fi

STEAMCMD_IMAGE="${STEAMCMD_IMAGE:-steamcmd/steamcmd:debian-12}"

echo "=========================================="
echo "  Steam upload — $APP_LABEL (App $APP_ID)"
echo "=========================================="
echo ""
if [ "$RUNNER_MODE" = "docker" ]; then
    echo "  runner:            docker ($STEAMCMD_IMAGE)"
else
    echo "  runner:            host steamcmd"
fi
echo "  auth:              credentials (password${STEAM_GUARD_CODE:+ + guard code})"
echo "  MANA_SERVER_URL:   $MANA_SERVER_URL"
echo "  Steam account:     $STEAM_USERNAME"
echo "  build desc:        $STEAM_BUILD_DESC"
echo ""

# --- Pre-push checks (skip with MANA_SKIP_CHECKS=1) ---
if [ "${MANA_SKIP_CHECKS:-0}" != "1" ]; then
    echo ">>> Pre-push checks (npm run test:unit && npm run typecheck) ..."
    # The release-build env var above is for the webpack build step only —
    # don't leak it into the tests (RemoteServer/steamAuth unit tests assert
    # the localhost DEFAULT_SERVER_URL fallback).
    (cd "$PHASER_DIR" && env -u MANA_SERVER_URL npm run test:unit && npm run typecheck)
    echo ""
fi

# --- Build the Electron app (bakes MANA_SERVER_URL) ---
# win+linux are built x64; mac MUST be a separate --universal invocation
# (electron-builder's `--dir` otherwise uses the host arch, and the Steam
# depots expect mac-universal). Requires the x64ArchFiles mac config in
# phaser/package.json for steamworks.js native binaries.
if [ "${MANA_SKIP_BUILD:-0}" != "1" ]; then
    echo ">>> Building Electron app (win + mac + linux) ..."
    if [ "$DEMO" = "1" ]; then
        (cd "$PHASER_DIR" && IS_DEMO=true npm run build && \
         IS_DEMO=true npx electron-builder --win --linux --dir --x64 && \
         IS_DEMO=true npx electron-builder --mac --dir --universal)
    else
        (cd "$PHASER_DIR" && npm run build && \
         npx electron-builder --win --linux --dir --x64 && \
         npx electron-builder --mac --dir --universal)
    fi
    echo ""
fi

# --- Verify the build output for every depot exists and is non-empty ---
# An existing-but-empty depot dir uploads as an empty Steam depot — the
# player gets a 0B install folder with no error at push time — so emptiness
# fails the push here instead of shipping a hollow build.
BUILD_DIRS=(win-unpacked mac-universal linux-unpacked)
MISSING_DIRS=()
EMPTY_DIRS=()
for d in "${BUILD_DIRS[@]}"; do
    if [ ! -d "$PHASER_DIR/dist-electron/$d" ]; then
        MISSING_DIRS+=("$d")
    elif [ -z "$(ls -A "$PHASER_DIR/dist-electron/$d")" ]; then
        EMPTY_DIRS+=("$d")
    fi
done
if [ "${#MISSING_DIRS[@]}" -gt 0 ]; then
    echo "Error: missing build output — ${MISSING_DIRS[*]} under $PHASER_DIR/dist-electron/"
    echo "Build all three platforms first (the script does this unless"
    echo "MANA_SKIP_BUILD=1):  cd phaser && npm run build && npx electron-builder --win --linux --dir --x64 && npx electron-builder --mac --dir --universal"
    exit 1
fi
if [ "${#EMPTY_DIRS[@]}" -gt 0 ]; then
    echo "Error: empty build output — ${EMPTY_DIRS[*]} under $PHASER_DIR/dist-electron/"
    echo "electron-builder left these depot dirs with no files; uploading them"
    echo "produces an empty (0B) Steam install. Delete them and rebuild:"
    echo "  cd phaser && npx electron-builder --win --linux --dir --x64 && npx electron-builder --mac --dir --universal"
    exit 1
fi

# --- Generate the app + depot build configs ---
# The checked-in templates use paths relative to the VDF directory
# (../../phaser/dist-electron/...). steamcmd resolves those against its own
# working directory — NOT the VDF location — so under the Docker runner (CWD
# /) they point at nothing and the depots upload EMPTY with no error, which
# is exactly the "0B folder on Steam" failure. The generated *.gen.vdf files
# below use absolute paths: the fixed container paths in Docker mode (which
# match the -v mounts in RUN_CMD), the host paths otherwise.
# NOTE: use the POSIX [[:space:]] class, not `\s` — macOS ships BSD sed which
# doesn't understand `\s`, and a non-matching pattern would pass the line
# through with the old value.
if [ "$RUNNER_MODE" = "docker" ]; then
    VDF_CONTENT_BASE="/repo/phaser/dist-electron"
    VDF_BUILD_BASE="/repo/phaser/$BUILD_DIR_NAME"
else
    VDF_CONTENT_BASE="$PHASER_DIR/dist-electron"
    VDF_BUILD_BASE="$BUILD_OUTPUT_DIR"
fi
if [ "$DEMO" = "1" ]; then
    DEPOT_PREFIX="depot_build_demo_"
else
    DEPOT_PREFIX="depot_build_"
fi
for PLATFORM_DIR in win-unpacked mac-universal linux-unpacked; do
    case "$PLATFORM_DIR" in
        win-unpacked)   DEPOT_SUFFIX="win" ;;
        mac-universal)  DEPOT_SUFFIX="mac" ;;
        linux-unpacked) DEPOT_SUFFIX="linux" ;;
    esac
    sed "s|^\([[:space:]]*\"ContentRoot\"[[:space:]]*\).*|\1\"$VDF_CONTENT_BASE/$PLATFORM_DIR\"|" \
        "$STEAM_CONFIG_DIR/${DEPOT_PREFIX}${DEPOT_SUFFIX}.vdf" \
        > "$STEAM_CONFIG_DIR/${DEPOT_PREFIX}${DEPOT_SUFFIX}.gen.vdf"
done
# App build: descriptive name + the generated depot files + absolute
# contentroot/buildoutput (same relative-resolution hazard as ContentRoot).
sed -e "s/^\([[:space:]]*\"desc\"[[:space:]]*\).*/\1\"$STEAM_BUILD_DESC\"/" \
    -e "s|^\([[:space:]]*\"contentroot\"[[:space:]]*\).*|\1\"$VDF_CONTENT_BASE\"|" \
    -e "s|^\([[:space:]]*\"buildoutput\"[[:space:]]*\).*|\1\"$VDF_BUILD_BASE\"|" \
    -e "s|\"${DEPOT_PREFIX}\([a-z]*\)\.vdf\"|\"${DEPOT_PREFIX}\1.gen.vdf\"|" \
    "$STEAM_CONFIG_DIR/$BUILD_VDF" > "$STEAM_CONFIG_DIR/$GEN_VDF"

# --- Build the upload command (docker is the default runner) ---
# Credentials are collected above (prompt or env), so both runners take the
# same +login args — Docker stays non-interactive-friendly.
if [ "$RUNNER_MODE" = "docker" ]; then
    mkdir -p "$BUILD_OUTPUT_DIR"
    RUN_CMD=(docker run --rm -i \
        --platform linux/amd64 \
        -v "$STEAM_CONFIG_DIR:/repo/steam/steam_config" \
        -v "$PHASER_DIR/dist-electron:/repo/phaser/dist-electron:ro" \
        -v "$BUILD_OUTPUT_DIR:/repo/phaser/$BUILD_DIR_NAME" \
        "$STEAMCMD_IMAGE" \
        +login "${LOGIN_ARGS[@]}" \
        +run_app_build_http "/repo/steam/steam_config/$GEN_VDF" \
        +quit)
else
    RUN_CMD=(steamcmd \
        +login "${LOGIN_ARGS[@]}" \
        +run_app_build_http "$STEAM_CONFIG_DIR/$GEN_VDF" \
        +quit)
fi

# Redact the password/guard code for display.
REDACTED_LOGIN=()
for arg in "${LOGIN_ARGS[@]}"; do
    if [ -n "${STEAM_PASSWORD:-}" ] && [ "$arg" = "$STEAM_PASSWORD" ]; then
        REDACTED_LOGIN+=('***')
    elif [ -n "${STEAM_GUARD_CODE:-}" ] && [ "$arg" = "$STEAM_GUARD_CODE" ]; then
        REDACTED_LOGIN+=('***')
    else
        REDACTED_LOGIN+=("$arg")
    fi
done

if [ "$RUNNER_MODE" = "docker" ]; then
    DISPLAY_RUN=(docker run --rm -i --platform linux/amd64 \
        -v "$STEAM_CONFIG_DIR:/repo/steam/steam_config" \
        -v "$PHASER_DIR/dist-electron:/repo/phaser/dist-electron:ro" \
        -v "$BUILD_OUTPUT_DIR:/repo/phaser/$BUILD_DIR_NAME" \
        "$STEAMCMD_IMAGE" \
        +login "${REDACTED_LOGIN[@]}" \
        +run_app_build_http "/repo/steam/steam_config/$GEN_VDF" \
        +quit)
    DISPLAY_CMD="printf '\\n' | ${DISPLAY_RUN[*]}"
else
    DISPLAY_CMD="steamcmd +login ${REDACTED_LOGIN[*]} +run_app_build_http $STEAM_CONFIG_DIR/$GEN_VDF +quit"
fi

echo ">>> Uploading to Steam (App $APP_ID) ..."
echo "    build desc: $STEAM_BUILD_DESC"
echo ""

if [ "${STEAM_DRY_RUN:-0}" = "1" ]; then
    echo "(dry run — STEAM_DRY_RUN=1, nothing was uploaded)"
    echo "  $DISPLAY_CMD"
    echo ""
    echo "--- generated $GEN_VDF ---"
    cat "$STEAM_CONFIG_DIR/$GEN_VDF"
    for PLATFORM_DIR in win mac linux; do
        echo ""
        echo "--- generated ${DEPOT_PREFIX}${PLATFORM_DIR}.gen.vdf ---"
        cat "$STEAM_CONFIG_DIR/${DEPOT_PREFIX}${PLATFORM_DIR}.gen.vdf"
    done
    exit 0
fi

# Called when the steamcmd upload exits non-zero. The most common cause is the
# login step (wrong password / expired guard code) — just re-run and type
# fresh credentials when prompted.
upload_failed() {
    local code=$?
    echo ""
    echo "!!! Steam upload failed (steamcmd exited with code $code)."
    echo ""
    echo "If the log above shows a login error (Invalid Password / Timeout /"
    echo "Waiting for confirmation), re-run and type a fresh Steam Guard code"
    echo "when prompted:"
    echo ""
    echo "  make steam-publish"
    echo ""
    exit 1
}

if [ "$RUNNER_MODE" = "docker" ]; then
    # Auto-answer the one-time "Steam Subscriber Agreement — press Enter"
    # prompt steamcmd prints on a fresh container login.
    if ! printf '\n' | "${RUN_CMD[@]}"; then
        upload_failed
    fi
else
    if ! "${RUN_CMD[@]}"; then
        upload_failed
    fi
fi

echo ""
echo "=========================================="
echo "  Upload complete! Build \"$STEAM_BUILD_DESC\" was pushed to App $APP_ID."
echo "  Promote it when ready: Steamworks → $APP_ID → Builds →"
echo "  the new build → Set branch / Release Candidate."
echo "=========================================="
