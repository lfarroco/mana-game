# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /build

# Install server dependencies (includes devDeps for tsup)
COPY server/package.json ./
RUN npm install

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

# Install production dependencies only
COPY server/package.json ./
RUN npm install --omit=dev

# Copy the bundled output
COPY --from=builder /build/dist ./dist

# Runtime config
ENV MANA_SERVER_HOST=0.0.0.0
ENV MANA_SERVER_PORT=8787
EXPOSE 8787

# Non-root user
USER node

CMD ["node", "dist/index.js"]
