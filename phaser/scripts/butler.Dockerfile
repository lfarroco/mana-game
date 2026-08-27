# butler (itch.io's upload CLI) in a minimal container, so publishing needs no
# host install. The binary comes from itch.io's own permanent broth CDN — the
# same source as the official CI instructions
# (https://broth.itch.zone/butler — see https://itch.io/docs/butler/installing.html).
#
# NOTE: butler's linux build is glibc-linked (ELF interpreter
# `/lib64/ld-linux-x86-64.so.2`), so the runtime stage uses Debian (glibc), not
# Alpine (musl) — a musl base fails at exec with "no such file or directory".
# The zip also contains butler's 7-zip helper libraries; copying the whole
# extracted dir keeps them intact.
#
# Usage (from the repo root):
#   docker build -t mana-butler -f phaser/scripts/butler.Dockerfile phaser/scripts
#
# `make itch-publish` auto-builds this image on first use if butler is not
# installed on the host. Rebuild (or `docker rmi mana-butler`) to pick up new
# butler releases.

FROM alpine:3.21 AS fetch
RUN apk add --no-cache curl unzip \
    && curl -fsSL https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default -o /butler.zip \
    && unzip /butler.zip -d /out

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=fetch /out/. /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/butler"]

