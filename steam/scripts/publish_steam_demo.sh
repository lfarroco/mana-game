#!/bin/bash

# Steam Demo Upload Script
# =========================
# Uploads the demo version of Mana Battle to Steam (App ID: 4233280).
# Thin wrapper over publish_steam.sh — it just flips STEAM_DEMO=1 so the same
# build → upload flow (Docker runner, pre-push checks, versioned build desc)
# targets the demo app. See publish_steam.sh for all overrides and docs.

STEAM_DEMO=1 exec "$(cd "$(dirname "$0")" && pwd)/publish_steam.sh" "$@"
