MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app
PHASER_DIR=phaser
ANDROID_DIR=android
STEAM_DIR=steam
SERVER_DIR=server

# Optional local overrides — create a root .env (gitignored) with e.g.:
#   MANA_STEAM_WEB_API_KEY=<your publisher Web API key>
#   MANA_SERVER_PORT=8787
#   MANA_SQLITE_PATH=server/data/mana.db
#   MANA_STEAM_APP_IDS=3757600,4233280
#   MANA_SERVER_URL=<functions-url>  (electron-dev-cloud / android-build /
#     publish scripts — defaults to the production Cloud Function)
-include .env
export

# The dev machine has no system JDK — the Android build uses Android Studio's
# bundled JBR. Override by exporting JAVA_HOME or setting it in root .env.
JAVA_HOME ?= /Applications/Android Studio.app/Contents/jbr/Contents/Home

.PHONY: dev electron electron-dev electron-dev-cloud electron-dev-demo electron-pack electron-build electron-build-win electron-build-mac electron-build-linux electron-build-all electron-build-demo electron-build-demo-win electron-build-demo-mac electron-build-demo-linux electron-build-demo-all android-build android-open steam-publish steam-publish-demo steam-cmd-image itch-publish itch-butler-image server-install server-dev server-test server-typecheck server-mp server-db server-db-summary functions-deploy

dev:
	cd $(PHASER_DIR) && npm run dev

electron:
	cd $(PHASER_DIR) && npx electron electron/main.cjs

electron-dev:
	cd $(PHASER_DIR) && NODE_ENV=development npm run build && NODE_ENV=development npx electron electron/main.cjs

electron-dev-demo:
	cd $(PHASER_DIR) && IS_DEMO=true NODE_ENV=development npm run build && IS_DEMO=true NODE_ENV=development npx electron electron/main.cjs

# Electron dev client pointed at the REMOTE production API instead of the
# local server. MANA_SERVER_URL (or the production Cloud Function default
# below) becomes the baked-in server URL for the webpack build, and Electron
# loads the freshly built dist/ bundle (MANA_LOAD_DIST=1) so no local
# webpack-dev-server is required — DevTools still open.
electron-dev-cloud:
	cd $(PHASER_DIR) && MANA_SERVER_URL=$${MANA_SERVER_URL:-https://us-central1-mana-battle-f3b15.cloudfunctions.net/api} NODE_ENV=development npm run build && MANA_LOAD_DIST=1 NODE_ENV=development npx electron electron/main.cjs

electron-pack:
	cd $(PHASER_DIR) && npm run build && npx electron-builder

electron-build:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --publish=never

electron-build-win:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --win --dir --x64

electron-build-mac:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --mac --dir --universal

electron-build-linux:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --linux --dir --x64

# All-platform build (win/mac/linux) — win+linux are x64, mac is universal.
# The mac build MUST be a separate invocation with --universal: electron-builder's
# `--dir` otherwise uses the host arch (Intel → mac/, Apple Silicon → mac-arm64),
# while the Steam depots expect mac-universal. --universal also needs the
# x64ArchFiles config in phaser/package.json for steamworks.js native binaries.
electron-build-all:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --win --linux --dir --x64 && npx electron-builder --mac --dir --universal

electron-build-demo:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --publish=never --dir

# All-platform demo build (win + mac + linux) — the build step behind
# `make steam-publish-demo`. Mirrors electron-build-all with IS_DEMO=true.
electron-build-demo-all:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --win --linux --dir --x64 && IS_DEMO=true npx electron-builder --mac --dir --universal

electron-build-demo-win:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --win --dir --x64

electron-build-demo-mac:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --mac --dir --universal

electron-build-demo-linux:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --linux --dir --x64

# Build for Android via Capacitor (docs/android-multiplayer.md). The root
# .env (sourced above) provides MANA_SERVER_URL / MANA_GOOGLE_CLIENT_ID /
# MANA_ITCH_CLIENT_ID — all three are baked in by webpack's DefinePlugin.
# MANA_SERVER_URL defaults to the production API so a release build never
# silently points at 127.0.0.1:8787.
#
# Versioning: scripts/bump-android-version.sh bumps android/app/build.gradle
# before building — versionCode always +1 (Play requires a never-reused code),
# versionName prompted interactively (Enter = auto patch bump) or taken from
# $VERSION when given (e.g. `VERSION=1.3 make android-build`).
# The last step runs `gradlew bundleRelease`, producing the AAB at
# android/app/build/outputs/bundle/release/app-release.aab. Signing is
# conditional: set MANA_KEYSTORE_PATH (+ _STORE_PASSWORD / _KEY_ALIAS /
# _KEY_PASSWORD) in the root .env for an upload-signed AAB; unset → unsigned
# AAB (sign via Android Studio's Generate Signed Bundle as before).
android-build:
	@if [ -z "$$MANA_GOOGLE_CLIENT_ID" ]; then \
		echo "WARNING: MANA_GOOGLE_CLIENT_ID is unset — Google sign-in will be disabled in this build."; \
	fi
	@VERSION="$(VERSION)" bash scripts/bump-android-version.sh
	cd $(PHASER_DIR) && MANA_SERVER_URL=$${MANA_SERVER_URL:-https://us-central1-mana-battle-f3b15.cloudfunctions.net/api} npm run build && npx cap sync android
	cd $(ANDROID_DIR) && JAVA_HOME="$(JAVA_HOME)" ./gradlew bundleRelease
	@echo "AAB: $(ANDROID_DIR)/app/build/outputs/bundle/release/app-release.aab"

android-open:
	cd $(PHASER_DIR) && npx cap open android

# Build the production Electron app for all platforms and upload it to Steam
# (steam/scripts/publish_steam.sh) — SteamPipe, no upload dashboard. Reads the
# root .env (safe parse), defaults MANA_SERVER_URL to prod, runs pre-push
# tests + typecheck, builds win/mac/linux, then uploads via steamcmd in the
# `steamcmd/steamcmd:debian-12` Docker image (default — nothing installed on
# the host; force host steamcmd with STEAM_CMD=host). Auth is interactive:
# STEAM_USERNAME comes from .env, the password + Steam Guard code are prompted
# (export STEAM_PASSWORD / STEAM_GUARD_CODE for a non-interactive run).
# See steam/STEAM_UPLOAD.md.
steam-publish:
	./$(STEAM_DIR)/scripts/publish_steam.sh

steam-publish-demo:
	./$(STEAM_DIR)/scripts/publish_steam_demo.sh

# Pull (or refresh) the official steamcmd image used by `make steam-publish`
# when the host has no steamcmd installed (the default runner is Docker).
steam-cmd-image:
	docker pull steamcmd/steamcmd:debian-12

# Build the production web build and push it to itch.io via butler
# (phaser/scripts/publish_itch.sh) — no upload dashboard needed. Exports the
# root .env (already done above). Uses a host `butler` if installed, otherwise
# runs butler in the `mana-butler` Docker image (auto-built from
# phaser/scripts/butler.Dockerfile — nothing installed on the host). Docker
# mode needs MANA_BUTLER_API_KEY in .env. See docs/building-and-running.md §itch.io.
itch-publish:
	./phaser/scripts/publish_itch.sh

# Build (or refresh) the butler Docker image used by `make itch-publish` when
# butler is not installed on the host.
itch-butler-image:
	docker build -t mana-butler -f phaser/scripts/butler.Dockerfile phaser/scripts




# ---- Game Server ----

server-install:
	cd $(SERVER_DIR) && npm install

server-dev:
	cd $(SERVER_DIR) && npm run dev

server-test:
	cd $(SERVER_DIR) && npm test

server-typecheck:
	cd $(SERVER_DIR) && npm run typecheck

# ---- Local multiplayer testing (Steam auth + SQLite persistence) ----

# One-command local dev loop for the multiplayer/Steam flow:
#   - Steam auth enabled (requires MANA_STEAM_WEB_API_KEY in .env or the env)
#   - SQLite persistence (default server/data/mana.db) so sessions, ghosts,
#     and ratings survive restarts and accumulate across test players
#   - binds 127.0.0.1:8787 (the client's default MANA_SERVER_URL)
# Foreground with tsx watch — Ctrl-C to stop.
server-mp: server-install
	@if [ -z "$$MANA_STEAM_WEB_API_KEY" ]; then \
		echo "ERROR: MANA_STEAM_WEB_API_KEY is not set — POST /auth/steam will not be registered."; \
		echo "Create a root .env (gitignored) or export it, e.g.:"; \
		echo "  echo 'MANA_STEAM_WEB_API_KEY=yourkey' > .env"; \
		exit 1; \
	fi
	@echo "=== Mana Battle multiplayer server (local) ==="
	@echo "  URL:      http://127.0.0.1:$${MANA_SERVER_PORT:-8787}"
	@echo "  SQLite:   $${MANA_SQLITE_PATH:-server/data/mana.db} (survives restarts)"
	@echo "  App IDs:  $${MANA_STEAM_APP_IDS:-3757600,4233280}"
	@echo "  Ctrl-C to stop. The Steam Electron build points here by default."
	cd $(SERVER_DIR) && MANA_SQLITE_PATH="$${MANA_SQLITE_PATH:-./data/mana.db}" npm run dev

# ---- Local SQLite inspection ----
#
# The DB is the bare `make server-mp` database at server/data/mana.db
# (honors MANA_SQLITE_PATH). Production runs on Firestore — inspect it via
# the Firebase console or `firebase firestore:*`.

# Interactive sqlite3 shell on the local database file.
server-db:
	@if [ -f "$${MANA_SQLITE_PATH:-server/data/mana.db}" ]; then \
		DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	else \
		echo "No database found. Start a bare server (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" ".tables"; \
	echo "--- try: SELECT * FROM players; .schema sessions; .quit ---"; \
	sqlite3 "$$DB"

# Quick row counts per table (players, sessions, ghosts, ratings, ...) —
# handy while testing matchmaking ("did my ghost get stored?").
server-db-summary:
	@if [ -f "$${MANA_SQLITE_PATH:-server/data/mana.db}" ]; then \
		DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	else \
		echo "No database found. Start a bare server (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" "SELECT 'players', COUNT(*) FROM players UNION ALL SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'combat_states', COUNT(*) FROM combat_states UNION ALL SELECT 'ghosts', COUNT(*) FROM ghosts UNION ALL SELECT 'recently_fought', COUNT(*) FROM recently_fought UNION ALL SELECT 'ratings', COUNT(*) FROM ratings;"

# ---- Production deployment (Cloud Functions + Firestore) ----
#
# Production is the Firebase backend (docs/firebase-backend.md): one 2nd-gen
# HTTPS function (`api`) serving the Express app, Firestore for persistence.
# The Oracle VM / compose / Caddy deployment was decommissioned 2026-09-06.
# Inspect production data via the Firebase console or `firebase firestore:*`;
# logs via `firebase functions:log --project <id>`.

# Firebase project id for the production deploy.
FIREBASE_PROJECT ?= mana-battle-f3b15

functions-deploy:
	@echo "=== Deploying to $(FIREBASE_PROJECT) ==="
	cd $(SERVER_DIR) && npm run deploy:functions -- --project $(FIREBASE_PROJECT)
