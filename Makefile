MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app


dev:
	cd phaser && npm run dev