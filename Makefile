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
#   MANA_DROPLET=root@<droplet-ip>      (make droplet-deploy)
#   MANA_API_DOMAIN=api.manabattle.com  (make droplet-setup / electron-dev-droplet)
-include .env
export

.PHONY: dev electron electron-dev electron-dev-droplet electron-dev-demo electron-pack electron-build electron-build-win electron-build-mac electron-build-linux electron-build-all electron-build-demo electron-build-demo-win electron-build-demo-mac electron-build-demo-linux android-build android-open steam-publish steam-publish-demo server-install server-dev server-test server-typecheck server-build server-run server-stop server-mp server-compose-up server-compose-down server-db server-db-summary droplet-deploy droplet-setup droplet-logs droplet-db-download droplet-db droplet-db-summary

dev:
	cd $(PHASER_DIR) && npm run dev

electron:
	cd $(PHASER_DIR) && npx electron electron/main.cjs

electron-dev:
	cd $(PHASER_DIR) && NODE_ENV=development npm run build && NODE_ENV=development npx electron electron/main.cjs

electron-dev-demo:
	cd $(PHASER_DIR) && IS_DEMO=true NODE_ENV=development npm run build && IS_DEMO=true NODE_ENV=development npx electron electron/main.cjs

# Electron dev client pointed at the REMOTE droplet API instead of the local
# server. The droplet's TLS domain (default api.manabattle.com, override via
# MANA_API_DOMAIN in .env) becomes the baked-in MANA_SERVER_URL for the
# webpack build, and Electron loads the freshly built dist/ bundle
# (MANA_LOAD_DIST=1) so no local webpack-dev-server is required — DevTools
# still open. The server must be deployed first: `make droplet-deploy`.
electron-dev-droplet:
	cd $(PHASER_DIR) && MANA_SERVER_URL=https://$(MANA_API_DOMAIN) NODE_ENV=development npm run build && MANA_LOAD_DIST=1 NODE_ENV=development npx electron electron/main.cjs

electron-pack:
	cd $(PHASER_DIR) && npm run build && npx electron-builder

electron-build:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --publish=never

electron-build-win:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --win --dir

electron-build-mac:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --mac --dir

electron-build-linux:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --linux --dir

electron-build-all:
	cd $(PHASER_DIR) && npm run build && npx electron-builder --win --mac --linux --dir

electron-build-demo:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --publish=never --dir

electron-build-demo-win:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --win --dir

electron-build-demo-mac:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --mac --dir

electron-build-demo-linux:
	cd $(PHASER_DIR) && IS_DEMO=true npm run build && IS_DEMO=true npx electron-builder --linux --dir

android-build:
	cd $(PHASER_DIR) && npm run build && npx cap sync android

android-open:
	cd $(PHASER_DIR) && npx cap open android

steam-publish:
	./$(STEAM_DIR)/scripts/publish_steam.sh

steam-publish-demo:
	./$(STEAM_DIR)/scripts/publish_steam_demo.sh




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
	docker run -d --name $(CONTAINER_NAME) -p 8787:8787 $(IMAGE_NAME)

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

# Interactive sqlite3 shell on the local multiplayer database (default
# server/data/mana.db; honors MANA_SQLITE_PATH from .env).
server-db:
	@DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	if [ "$$DB" = ":memory:" ]; then \
		echo "The server is using :memory: SQLite — nothing to inspect."; \
		echo "Set MANA_SQLITE_PATH to a file (e.g. server/data/mana.db) to persist + inspect."; \
		exit 1; \
	fi; \
	if [ ! -f "$$DB" ]; then \
		echo "No database found at $$DB — start the server first (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" ".tables"; \
	echo "--- try: SELECT * FROM players; .schema sessions; .quit ---"; \
	sqlite3 "$$DB"

# Quick row counts per table (players, sessions, ghosts, ratings, ...) —
# handy while testing matchmaking ("did my ghost get stored?").
server-db-summary:
	@DB="$${MANA_SQLITE_PATH:-server/data/mana.db}"; \
	if [ "$$DB" = ":memory:" ]; then \
		echo "The server is using :memory: SQLite — nothing to inspect."; \
		echo "Set MANA_SQLITE_PATH to a file (e.g. server/data/mana.db) to persist + inspect."; \
		exit 1; \
	fi; \
	if [ ! -f "$$DB" ]; then \
		echo "No database found at $$DB — start the server first (make server-mp)."; \
		exit 1; \
	fi; \
	echo "=== Mana Battle database: $$DB ==="; \
	sqlite3 "$$DB" "SELECT 'players', COUNT(*) FROM players UNION ALL SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'combat_states', COUNT(*) FROM combat_states UNION ALL SELECT 'ghosts', COUNT(*) FROM ghosts UNION ALL SELECT 'recently_fought', COUNT(*) FROM recently_fought UNION ALL SELECT 'ratings', COUNT(*) FROM ratings;"

# ---- Droplet deployment (bare systemd server on DigitalOcean) ----

# SSH target for the droplet (override in .env or via MANA_DROPLET=user@host).
MANA_DROPLET ?= root@143.198.180.95
# TLS domain used by Caddy on the droplet (setup-bare.sh --domain).
MANA_API_DOMAIN ?= api.manabattle.com

# Deploy the latest PUSHED code to the droplet. Warns — but proceeds — when
# there are uncommitted or unpushed local changes, because the droplet deploys
# whatever is already on origin. SSHes in and runs
# server/scripts/deploy-bare.sh --build, which does:
#   git pull --ff-only → npm ci → tsup build (dist/) → render systemd unit →
#   systemctl restart mana-server → wait for /health
# The SQLite DB (server/data/mana.db) survives the redeploy, so players and
# sessions carry over. Run from the repo root.
droplet-deploy:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "WARNING: working tree is dirty — uncommitted changes will NOT be deployed (the droplet pulls origin)."; \
	fi
	@if [ -n "$$(git log @{u}.. --oneline 2>/dev/null)" ]; then \
		echo "WARNING: unpushed local commits — deploy the pushed state; run 'git push' first if you meant the latest."; \
	fi
	@echo "=== Deploying to $(MANA_DROPLET) ==="
	ssh "$(MANA_DROPLET)" 'cd /opt/mana-game && ./server/scripts/deploy-bare.sh --build'

# One-shot droplet bootstrap (fresh droplet only): check + install missing
# pieces (Node, Caddy, ufw firewall, managame user, .env from .env.example,
# Caddyfile, systemd unit) then run the first deploy. Requires the repo to be
# cloned at /opt/mana-game and a DNS record pointing at the droplet.
droplet-setup:
	@echo "=== One-shot setup on $(MANA_DROPLET) (domain: $(MANA_API_DOMAIN)) ==="
	ssh "$(MANA_DROPLET)" 'cd /opt/mana-game && ./server/scripts/setup-bare.sh --domain $(MANA_API_DOMAIN)'

# ---- Droplet ops: logs + database ----

# Repo path on the droplet (override in .env or via MANA_DROPLET_APP=/path).
MANA_DROPLET_APP ?= /opt/mana-game

# Tail the mana-server logs (journald) on the droplet. Follows live by default;
# pass MANA_LOG_LINES=200 to print the last 200 lines and exit instead.
droplet-logs:
	@if [ -n "$${MANA_LOG_LINES:-}" ]; then \
		echo "=== mana-server: last $${MANA_LOG_LINES} lines ==="; \
		ssh "$(MANA_DROPLET)" "journalctl -u mana-server -n $${MANA_LOG_LINES} --no-pager" < /dev/null; \
	else \
		echo "=== following mana-server logs on $(MANA_DROPLET) (Ctrl-C to stop) ==="; \
		ssh "$(MANA_DROPLET)" "journalctl -u mana-server -f" < /dev/null; \
	fi

# Pull a crash-consistent snapshot of the live droplet DB. Runs the repo's
# better-sqlite3 online backup (server/scripts/backup-bare.sh — safe under WAL,
# no downtime) on the droplet, then scp's the newest snapshot down into
# server/data/backups/. Don't copy mana.db directly: with WAL journaling the
# live data mostly sits in mana.db-wal.
droplet-db-download:
	@mkdir -p server/data/backups
	@ssh "$(MANA_DROPLET)" "cd $(MANA_DROPLET_APP) && ./server/scripts/backup-bare.sh" < /dev/null
	@SNAP="$$(ssh "$(MANA_DROPLET)" "ls -t $(MANA_DROPLET_APP)/server/data/backups/mana-*.db | head -1" < /dev/null)"; \
	scp "$(MANA_DROPLET):$${SNAP}" server/data/backups/ >/dev/null && \
	echo "downloaded $$(basename "$$SNAP") -> server/data/backups/"

# Download a fresh snapshot, then open an interactive sqlite3 shell on the copy
# (same UX as `make server-db`, but against the live droplet DB).
droplet-db: droplet-db-download
	@SNAP="$$(ls -t server/data/backups/mana-*.db | head -1)"; \
	echo "=== Mana Battle droplet DB: $$SNAP ==="; \
	echo "--- try: .tables / SELECT * FROM players; .schema sessions; .quit ---"; \
	sqlite3 "$$SNAP"

# Quick row counts per table, from a fresh droplet snapshot.
droplet-db-summary: droplet-db-download
	@SNAP="$$(ls -t server/data/backups/mana-*.db | head -1)"; \
	sqlite3 "$$SNAP" "SELECT 'players', COUNT(*) FROM players UNION ALL SELECT 'tokens', COUNT(*) FROM tokens UNION ALL SELECT 'sessions', COUNT(*) FROM sessions UNION ALL SELECT 'combat_states', COUNT(*) FROM combat_states UNION ALL SELECT 'ghosts', COUNT(*) FROM ghosts UNION ALL SELECT 'recently_fought', COUNT(*) FROM recently_fought UNION ALL SELECT 'ratings', COUNT(*) FROM ratings;"
