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
-include .env
export

.PHONY: dev electron electron-dev electron-dev-demo electron-pack electron-build electron-build-win electron-build-mac electron-build-linux electron-build-all electron-build-demo electron-build-demo-win electron-build-demo-mac electron-build-demo-linux android-build android-open steam-publish steam-publish-demo server-install server-dev server-test server-typecheck server-build server-run server-stop server-mp server-compose-up server-compose-down

dev:
	cd $(PHASER_DIR) && npm run dev

electron:
	cd $(PHASER_DIR) && npx electron ../electron/main.cjs

electron-dev:
	cd $(PHASER_DIR) && NODE_ENV=development npm run build && NODE_ENV=development npx electron ../electron/main.cjs

electron-dev-demo:
	cd $(PHASER_DIR) && IS_DEMO=true NODE_ENV=development npm run build && IS_DEMO=true NODE_ENV=development npx electron ../electron/main.cjs

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