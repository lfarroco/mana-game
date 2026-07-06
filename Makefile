MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app
PHASER_DIR=phaser
STEAM_DIR=steam

.PHONY: dev electron electron-dev electron-dev-demo electron-pack electron-build electron-build-win electron-build-mac electron-build-linux electron-build-all electron-build-demo electron-build-demo-win electron-build-demo-mac electron-build-demo-linux android-build android-open steam-publish steam-publish-demo

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