#!/bin/bash

# Steam Demo Upload Script
# Uploads the demo version of Mana Battle to Steam (App ID: 4233280)

# Check if steamcmd is installed
if ! command -v steamcmd &> /dev/null; then
    echo "Error: steamcmd is not installed or not in your PATH."
    echo "Please install steamcmd: https://developer.valvesoftware.com/wiki/SteamCMD"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# Configuration
STEAM_CONFIG_DIR="$PROJECT_ROOT/steam_config"
APP_BUILD_VDF="app_build_demo.vdf"

echo "=========================================="
echo "  Steam Demo Upload"
echo "  App ID: 4233280"
echo "=========================================="
echo ""

# Check if demo build exists
if [ ! -d "$PROJECT_ROOT/dist-electron" ]; then
    echo "Error: dist-electron directory not found!"
    echo "Please build the demo version first:"
    echo "  npm run electron:build:demo"
    exit 1
fi

# Prompt for credentials if not set in env
if [ -z "$STEAM_USERNAME" ]; then
    read -p "Enter Steam Username: " STEAM_USERNAME
fi

echo ""
echo "Starting Steam Demo upload..."
echo "Build output will be in: dist-steam-demo/"
echo ""

# Run steamcmd
# Note: You might need to supply a password or 2FA code interactively.
# If you want to automate this fully, look into +login <user> <pass> <guard_code>
# but be careful with storing passwords.

steamcmd +login "$STEAM_USERNAME" +run_app_build_http "$STEAM_CONFIG_DIR/$APP_BUILD_VDF" +quit

echo ""
echo "=========================================="
echo "  Demo Upload Complete!"
echo "=========================================="
