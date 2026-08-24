# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /build

# The lockfile is copied so installs are reproducible — `npm ci`, not
# `npm install`. `--ignore-scripts` sidesteps a gotcha: npm runs a default
# `node-gyp rebuild` for better-sqlite3 because its `gypfile: false` manifest
# field isn't recorded in the lockfile (and alpine has no python/make/g++).
# That skips esbuild's postinstall too, so re-run it explicitly — tsup needs
# esbuild's platform binary at build time.
COPY server/package.json server/package-lock.json ./
RUN npm ci --ignore-scripts && node node_modules/esbuild/install.js

# Copy server source + build config
COPY server/src ./src
COPY server/tsconfig.json server/tsup.config.ts ./

# Copy core source (referenced by @game/* alias)
COPY core/src ../core/src
COPY core/package.json ../core/

# Bundle the server + core logic
RUN npm run build

# ---- Runtime Stage ----
FROM node:22-alpine

WORKDIR /app

# Install production dependencies only (lockfile pinned, reproducible).
# better-sqlite3 v13 ships prebuilt NAPI binaries (glibc + musl, x64 + arm64)
# that are loaded at require-time, but npm would still try `node-gyp rebuild`
# for it (the lockfile lacks `gypfile: false`) — so skip lifecycle scripts;
# nothing in the production tree needs them.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy the bundled output
COPY --from=builder /build/dist ./dist

# Runtime config
ENV MANA_SERVER_HOST=0.0.0.0
ENV MANA_SERVER_PORT=8787
EXPOSE 8787

# Non-root user + writable SQLite data dir (MANA_SQLITE_PATH=/data/mana.db
# in compose.yaml; the named volume is chowned to node here).
RUN mkdir -p /data && chown node:node /data
USER node

CMD ["node", "dist/index.js"]
