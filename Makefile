MOUNT=--mount type=bind,source=$(shell pwd)/app,target=/app

build:
	docker build -t mana:latest .

dev:
	docker run -d \
	--rm \
	-p 3000:3000 \
	$(MOUNT) \
	mana:latest