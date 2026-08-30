MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app
PHASER_DIR=phaser
STEAM_DIR=steam
SERVER_DIR=server
IMAGE_NAME=mana-server
CONTAINER_NAME=mana-server

# Optional local overrides — create a root .env (gitignored) with e.g.:
#   MANA_STEAM_WEB_API_KEY=<your publisher Web API key>
#   MANA_SERVER_PORT=8787
#   MANA_SQLITE_PATH=server/data/mana.db
#   MANA_STEAM_APP_IDS=3757600,4233280
#   MANA_CLOUD=root@<vm-ip>           (make cloud-deploy / cloud-setup)
#   MANA_CLOUD_KEY=~/.ssh/<key>       (all cloud-* targets; empty = agent/default keys)
#   MANA_API_DOMAIN=api.manabattle.com  (make cloud-setup / electron-dev-cloud)
-include .env
export

.PHONY: dev electron electron-dev electron-dev-cloud electron-dev-demo electron-pack electron-build electron-build-win electron-build-mac electron-build-linux electron-build-all electron-build-demo electron-build-demo-win electron-build-demo-mac electron-build-demo-linux electron-build-demo-all android-build android-open steam-publish steam-publish-demo steam-config-vdf steam-cmd-image itch-publish itch-butler-image server-install server-dev server-test server-typecheck server-build server-run server-stop server-mp server-compose-up server-compose-down server-db server-db-summary cloud-deploy cloud-setup cloud-logs cloud-db-download cloud-db cloud-db-summary

dev:
	cd $(PHASER_DIR) && npm run dev

electron:
	cd $(PHASER_DIR) && npx electron electron/main.cjs

electron-dev:
	cd $(PHASER_DIR) && NODE_ENV=development npm run build && NODE_ENV=development npx electron electron/main.cjs

electron-dev-demo:
	cd $(PHASER_DIR) && IS_DEMO=true NODE_ENV=development npm run build && IS_DEMO=true NODE_ENV=development npx electron electron/main.cjs

# Electron dev client pointed at the REMOTE cloud API instead of the local
# server. The cloud VM's TLS domain (default api.manabattle.com, override via
# MANA_API_DOMAIN in .env) becomes the baked-in MANA_SERVER_URL for the
# webpack build, and Electron loads the freshly built dist/ bundle
# (MANA_LOAD_DIST=1) so no local webpack-dev-server is required — DevTools
# still open. The server must be deployed first: `make cloud-deploy`.
electron-dev-cloud:
	cd $(PHASER_DIR) && MANA_SERVER_URL=https://$(MANA_API_DOMAIN) NODE_ENV=development npm run build && MANA_LOAD_DIST=1 NODE_ENV=development npx electron electron/main.cjs

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
android-build:
	@if [ -z "$$MANA_GOOGLE_CLIENT_ID" ]; then \
		echo "WARNING: MANA_GOOGLE_CLIENT_ID is unset — Google sign-in will be disabled in this build."; \
	fi
	cd $(PHASER_DIR) && MANA_SERVER_URL=$${MANA_SERVER_URL:-https://api.manabattle.com} npm run build && npx cap sync android

android-open:
	cd $(PHASER_DIR) && npx cap open android

# Build the production Electron app for all platforms and upload it to Steam
# (steam/scripts/publish_steam.sh) — SteamPipe, no upload dashboard. Reads the
# root .env (safe parse), defaults MANA_SERVER_URL to prod, runs pre-push
# tests + typecheck, builds win/mac/linux, then uploads via steamcmd in the
# `steamcmd/steamcmd:debian-12` Docker image (default — nothing installed on
# the host; force host steamcmd with STEAM_CMD=host). Credentials:
# STEAM_USERNAME (+ STEAM_PASSWORD / STEAM_GUARD_CODE for non-interactive
# Docker/CI). See steam/STEAM_UPLOAD.md.
steam-publish:
	./$(STEAM_DIR)/scripts/publish_steam.sh

steam-publish-demo:
	./$(STEAM_DIR)/scripts/publish_steam_demo.sh

# Pull (or refresh) the official steamcmd image used by `make steam-publish`
# when the host has no steamcmd installed (the default runner is Docker).
steam-cmd-image:
	docker pull steamcmd/steamcmd:debian-12

# Encode the locally-cached Steam session (config.vdf) into the root .env as
# STEAM_CONFIG_VDF_B64 so `make steam-publish` / `make steam-publish-demo` run
# fully unattended — no password or MFA prompts. See
# steam/scripts/encode_config_vdf.sh. Run it again if the session is
# invalidated (e.g. logging out of the Steam client).
steam-config-vdf:
	./$(STEAM_DIR)/scripts/encode_config_vdf.sh --update-env

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

server-build:
	docker build -f $(SERVER_DIR)/Dockerfile -t $(IMAGE_NAME) .

server-run:
	docker run -d --name $(CONTAINER_NAME) -p 127.0.0.1:8787:8787 $(IMAGE_NAME)

server-stop:
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true

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

# Docker alternative: build the server image and run it with a named volume
# for the SQLite data. Same .env requirements (compose fails fast if the
# Steam key is missing).
server-compose-up:
	docker compose up -d --build

server-compose-down:
	docker compose down

# ---- Local SQLite inspection ----
#
# The DB lives in two places depending on how you run the server:
#   - compose stack (make server-compose-up): in the mana-data volume at
#     /data/mana.db → snapshotted out via server/scripts/db-snapshot.sh
#   - bare `make server-mp`: at server/data/mana.db (honors MANA_SQLITE_PATH)
# Both targets below handle either.

# Interactive sqlite3 shell on the database (compose snapshot or local file).
server-db:
	@if docker compose ps --status running --services 2>/dev/null | grep -qx 'server'; then \
		echo "=== snapshotting compose DB (server/data/backups/) ==="; \
		DB="$$(./server/scripts/db-snapshot.sh)"; \
	elif [ -f "$${MANA_SQLITE_PATH:-server/data/mana.db}" ]; then \
		DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	else \
		echo "No database found. Start the compose stack (make server-compose-up) or a bare server (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" ".tables"; \
	echo "--- try: SELECT * FROM players; .schema sessions; .quit ---"; \
	sqlite3 "$$DB"

# Quick row counts per table (players, sessions, ghosts, ratings, ...) —
# handy while testing matchmaking ("did my ghost get stored?").
server-db-summary:
	@if docker compose ps --status running --services 2>/dev/null | grep -qx 'server'; then \
		DB="$$(./server/scripts/db-snapshot.sh)"; \
	elif [ -f "$${MANA_SQLITE_PATH:-server/data/mana.db}" ]; then \
		DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	else \
		echo "No database found. Start the compose stack (make server-compose-up) or a bare server (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" "SELECT 'players', COUNT(*) FROM players UNION ALL SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'combat_states', COUNT(*) FROM combat_states UNION ALL SELECT 'ghosts', COUNT(*) FROM ghosts UNION ALL SELECT 'recently_fought', COUNT(*) FROM recently_fought UNION ALL SELECT 'ratings', COUNT(*) FROM ratings;"

# ---- Production VM deployment (Docker flow: compose.yaml server + caddy) ----
#
# These targets talk to the production VM over SSH and are provider-agnostic
# (DigitalOcean, Oracle Cloud, Hetzner, ...). The VM runs the compose stack —
# bootstrap a fresh box with server/scripts/setup-docker.sh, redeploy with
# server/scripts/deploy.sh.

# SSH target for the VM (override in .env or via MANA_CLOUD=user@host).
MANA_CLOUD ?= root@<vm-ip>
# SSH private key for the VM (e.g. MANA_CLOUD_KEY=~/.ssh/oracle.key). Empty by
# default — ssh then falls back to the agent / default keys. Keep the key OUT
# of MANA_CLOUD: the cloud-* targets pass $(SSH_OPTS) explicitly, so every
# ssh/scp invocation shares it.
MANA_CLOUD_KEY ?=
# SSH options shared by every cloud-* target. Use unquoted in recipes so the
# shell can tilde-expand the key path.
SSH_OPTS := $(if $(MANA_CLOUD_KEY),-i $(MANA_CLOUD_KEY))
# TLS domain used by Caddy on the VM (setup-docker.sh --domain / compose).
MANA_API_DOMAIN ?= api.manabattle.com
# Repo URL used by cloud-setup when the VM has no clone yet.
MANA_REPO_URL ?= git@github.com:lfarroco/mana-game.git
# Repo path on the VM (override in .env or via MANA_CLOUD_APP=/path).
MANA_CLOUD_APP ?= /opt/mana-game

cloud-shell:
	ssh $(SSH_OPTS) "$(MANA_CLOUD)"


# Deploy the latest PUSHED code to the VM. Warns — but proceeds — when there
# are uncommitted or unpushed local changes, because the VM deploys whatever is
# already on origin. SSHes in and runs server/scripts/deploy.sh, which does:
#   git pull --ff-only → docker compose up -d --build → wait for /health
# The SQLite DB (mana-data volume) survives the redeploy, so players and
# sessions carry over. Run from the repo root.
cloud-deploy:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "WARNING: working tree is dirty — uncommitted changes will NOT be deployed (the VM pulls origin)."; \
	fi
	@if [ -n "$$(git log @{u}.. --oneline 2>/dev/null)" ]; then \
		echo "WARNING: unpushed local commits — deploy the pushed state; run 'git push' first if you meant the latest."; \
	fi
	@echo "=== Deploying to $(MANA_CLOUD) ==="
	ssh $(SSH_OPTS) "$(MANA_CLOUD)" 'cd $(MANA_CLOUD_APP) && ./server/scripts/deploy.sh'

# One-shot VM bootstrap (fresh VM only): clone the repo if needed, then run
# server/scripts/setup-docker.sh — installs Docker + the compose plugin, creates
# .env from .env.example (fill in the Steam key and re-run if missing), opens
# 22/80/443 via ufw (or use --no-firewall + a cloud security list), and runs
# the first deploy. Requires a DNS record pointing at the VM.
cloud-setup:
	@echo "=== One-shot setup on $(MANA_CLOUD) (domain: $(MANA_API_DOMAIN)) ==="
	ssh $(SSH_OPTS) "$(MANA_CLOUD)" "git clone $(MANA_REPO_URL) $(MANA_CLOUD_APP) 2>/dev/null || true; cd $(MANA_CLOUD_APP) && ./server/scripts/setup-docker.sh --domain $(MANA_API_DOMAIN)"

# ---- VM ops: logs + database ----

# Tail the mana-server logs on the VM (docker compose logs). Follows live by
# default; pass MANA_LOG_LINES=200 to print the last 200 lines and exit.
cloud-logs:
	@if [ -n "$${MANA_LOG_LINES:-}" ]; then \
		echo "=== mana-server: last $${MANA_LOG_LINES} lines ==="; \
		ssh $(SSH_OPTS) "$(MANA_CLOUD)" "cd $(MANA_CLOUD_APP) && docker compose logs --tail=$${MANA_LOG_LINES} --no-color server" < /dev/null; \
	else \
		echo "=== following mana-server logs on $(MANA_CLOUD) (Ctrl-C to stop) ==="; \
		ssh $(SSH_OPTS) "$(MANA_CLOUD)" "cd $(MANA_CLOUD_APP) && docker compose logs -f --no-color server" < /dev/null; \
	fi

# Pull a crash-consistent snapshot of the live VM DB. Runs the repo's
# better-sqlite3 online backup (server/scripts/backup.sh — safe under WAL, no
# downtime) inside the compose `server` container, then scp's the newest
# snapshot down into server/data/backups/. Don't copy mana.db directly: with
# WAL journaling the live data mostly sits in mana.db-wal.
cloud-db-download:
	@mkdir -p server/data/backups
	@ssh $(SSH_OPTS) "$(MANA_CLOUD)" "cd $(MANA_CLOUD_APP) && ./server/scripts/backup.sh" < /dev/null
	@SNAP="$$(ssh $(SSH_OPTS) "$(MANA_CLOUD)" "ls -t $(MANA_CLOUD_APP)/server/data/backups/mana-*.db | head -1" < /dev/null)"; \
	scp $(SSH_OPTS) "$(MANA_CLOUD):$${SNAP}" server/data/backups/ >/dev/null && \
	echo "downloaded $$(basename "$$SNAP") -> server/data/backups/"

# Download a fresh snapshot, then open an interactive sqlite3 shell on the copy
# (same UX as `make server-db`, but against the live VM DB).
cloud-db: cloud-db-download
	@SNAP="$$(ls -t server/data/backups/mana-*.db | head -1)"; \
	echo "=== Mana Battle VM DB: $$SNAP ==="; \
	echo "--- try: .tables / SELECT * FROM players; .schema sessions; .quit ---"; \
	sqlite3 "$$SNAP"

# Quick row counts per table, from a fresh VM snapshot.
cloud-db-summary: cloud-db-download
	@SNAP="$$(ls -t server/data/backups/mana-*.db | head -1)"; \
	sqlite3 "$$SNAP" "SELECT 'players', COUNT(*) FROM players UNION ALL SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'combat_states', COUNT(*) FROM combat_states UNION ALL SELECT 'ghosts', COUNT(*) FROM ghosts UNION ALL SELECT 'recently_fought', COUNT(*) FROM recently_fought UNION ALL SELECT 'ratings', COUNT(*) FROM ratings;"
