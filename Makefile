MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app

build:
	docker build -t mana:latest .

run:
	docker run -d \
	--name mana \
	-p 3000:3000 \
	$(MOUNT) \
	mana:latest

dev:
	cd app && npm run start