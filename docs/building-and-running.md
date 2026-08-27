# Building and Running

## Quick Start

```bash
cd phaser
npm install
npm run dev
```

Opens at `http://localhost:8080`

## Repository Layout

Monorepo with four npm packages plus a root `Makefile`:

| Package     | Purpose                                              | Commands |
|-------------|------------------------------------------------------|----------|
| `core/`     | Pure, framework-agnostic game logic (`@game/*`)      | `test`, `typecheck` |
| `framework/`| Engine-agnostic client framework (`@mana/framework`) | `test`, `typecheck` |
| `server/`   | Node multiplayer game server (express 5)             | `dev`, `test`, `typecheck`, `build` |
| `phaser/`   | The Phaser 3 game client                             | see below |
| root        | Prettier over the whole project + `make` targets     | `npm run format`, `make ...` |

Each package has its own `package.json`; run commands from inside the package
directory (e.g. `cd core && npm test`).

## Available Commands

### core

| Command                 | Description                                        |
|-------------------------|----------------------------------------------------|
| `npm test`              | Jest unit tests (66 suites / 602 tests)            |
| `npm run typecheck`     | `tsc --noEmit`                                     |

### framework

| Command                 | Description                                        |
|-------------------------|----------------------------------------------------|
| `npm test`              | Jest unit tests (7 suites / 56 tests)              |
| `npm run typecheck`     | `tsc --noEmit`                                     |

### server

| Command                 | Description                                        |
|-------------------------|----------------------------------------------------|
| `npm run dev`           | Start the API server (default `http://127.0.0.1:8787`) |
| `npm test`              | Jest unit + HTTP integration tests (188 tests)     |
| `npm run typecheck`     | `tsc --noEmit`                                     |
| `npm run build`         | tsup production bundle → `dist/`                   |

### phaser

| Command                 | Description                                        |
|-------------------------|----------------------------------------------------|
| `npm run dev`           | Start development server with hot reload           |
| `npm run dev:demo`      | Start development server in demo mode              |
| `npm run build`         | Create production web build                        |
| `npm test`              | Jest unit tests (use `test:ci` for CI parity)      |
| `npm test:ci`           | Jest with `--ci --maxWorkers=50%`                  |
| `npm run test:unit`     | Unit tests only (ignores `e2e`)                    |
| `npm run test:e2e`      | Playwright end-to-end tests (**currently broken**, see AGENTS.md) |
| `npm run lint`          | Run ESLint                                         |
| `npm run typecheck`     | `tsc --noEmit`                                     |
| `npm run format`        | Prettier on `phaser/src`                           |
| `npm run new:screen`    | Scaffold a new screen module                       |

### Running a single test file

```bash
# core / framework / server
npx jest src/path/ToFile.test.ts --runInBand

# phaser (has jest-jsdom + Phaser mocks configured)
npx jest src/path/ToFile.test.ts --runInBand
```

### Root / Makefile

| Command                   | Description                                                 |
|---------------------------|-------------------------------------------------------------|
| `npm run format`          | Prettier over `core/`, `framework/`, `server/`, `phaser/`   |
| `npm run format:check`    | Prettier check (no writes)                                  |
| `make dev`                | `cd phaser && npm run dev`                                  |
| `make electron-dev`       | Run desktop app in development mode                         |
| `make electron-dev-cloud` | Run desktop dev app against the remote cloud API (builds with `MANA_SERVER_URL=https://<MANA_API_DOMAIN>` and loads the built `dist` bundle — no local dev server needed) |
| `make electron-build`     | Build desktop app for current platform                      |
| `make electron-build-all` | Build desktop app for all platforms (Windows, macOS, Linux) |
| `make android-build`      | Build for Android via Capacitor                             |
| `make android-open`       | Open project in Android Studio                              |
| `make steam-publish`      | Upload build to Steam                                       |
| `make steam-publish-demo` | Upload demo build to Steam                                  |
| `make itch-publish`       | Build web build + upload to itch.io via butler (no dashboard) |
| `make server-dev`         | `cd server && npm run dev`                                  |
| `make server-test`        | `cd server && npm test`                                     |
| `make server-typecheck`   | `cd server && npm run typecheck`                            |
| `make server-build`       | Build the server Docker image                                |
| `make server-run` / `server-stop` | Run / stop the Dockerized server                     |

## Development Server

The phaser development server runs on port 8080 by default and includes:
- Hot module reloading
- Source maps for debugging
- TypeScript compilation

## Building for Production

> **Release builds must bake the production server URL.** `MANA_SERVER_URL`
> (and `MANA_ITCH_CLIENT_ID` for the web build) are compile-time `DefinePlugin`
> values — if unset, the client falls back to `http://127.0.0.1:8787` (the
> player's own machine) / disables browser login. The webpack production build
> warns loudly when either is missing. The Makefile sources the root `.env`
> (via `-include .env`), so you can set them there; see
> [.env.example](../.env.example) and [release-audit.md](release-audit.md).

### Web Build

```bash
cd phaser
MANA_SERVER_URL=https://api.manabattle.com MANA_ITCH_CLIENT_ID=f20213f3887151a962afac88d0145c57 npm run build
```

Creates an optimized production build in the `dist` directory (this is the
artifact uploaded to itch.io).

### itch.io upload (automated)

```bash
make itch-publish
```

Builds the production web build and pushes it to itch.io with **butler** — no
upload dashboard needed. Under the hood: `phaser/scripts/publish_itch.sh` (the
target above is a thin wrapper).

- **Runner**: a host `butler` if installed — otherwise a small `mana-butler`
  Docker image built from `phaser/scripts/butler.Dockerfile` (auto-built on
  first use; **nothing is installed on the host**). Force Docker even when
  butler is installed with `ITCH_BUTLER=docker`. Build the image explicitly
  with `make itch-butler-image`.
- **Credentials**: `butler login` once (host mode), or set
  `MANA_BUTLER_API_KEY` in the root `.env` (an API key with source `wharf`
  from <https://itch.io/user/settings/api-keys>). **Docker mode requires the
  key** — the container has no cached login.
- The script reads the root `.env` (safe parse — it only extracts
  `MANA_SERVER_URL`, `MANA_ITCH_CLIENT_ID`, `MANA_BUTLER_API_KEY`, so the
  Make-flavored lines in that file are ignored) and defaults the first two to
  the production values, so the pushed build always has working multiplayer.
- Pushes `dist/` to the **`html5`** channel of `lfarroco/mana-battle`
  (the "play in browser" page). Same-channel pushes **update** the existing
  upload, and butler only uploads the changed blocks. The **first push
  creates the `html5` channel** — if the page already has uploads made via
  the dashboard, delete the stale one(s) from the Edit Game page afterwards.
- Overrides: `ITCH_USER_GAME`, `ITCH_VERSION`, `ITCH_IF_CHANGED=1`
  (skip no-op pushes), `MANA_SKIP_CHECKS=1` (skip pre-push
  `test:unit` + `typecheck`).

### Desktop Build

```bash
MANA_SERVER_URL=https://api.manabattle.com make electron-build-all
```

Builds standalone executables for:
- Windows (`.exe`)
- macOS (`.dmg`)
- Linux (`.AppImage`)

Build outputs are placed in the `dist-electron` directory (uploaded to Steam —
see `steam/STEAM_UPLOAD.md`).

### Server

```bash
cd server
npm run build          # tsup bundle → dist/
make server-build      # or the Docker image
```

### Multiplayer auth configuration (web build)

itch.io browser players log in via the itch.io OAuth popup (see
[itchio-auth.md](itchio-auth.md)). The relevant env vars:

| Var | Where | Meaning |
|---|---|---|
| `MANA_ITCH_CLIENT_ID` | `phaser/` web build (webpack DefinePlugin) | Public itch.io OAuth client id; empty → browser multiplayer shows "itch auth not configured" |
| `MANA_ITCH_ENABLED` | `server/` | `true` registers `POST /api/v1/auth/itch` (default `false`) |
| `MANA_CORS_ORIGIN` | `server/` | Allow the itch.io origins in production: `https://html-classic.itch.zone` (the game iframe origin — what the embedded game sends) and `https://lfarroco.itch.io`, comma-separated |
| `MANA_SERVER_URL` | `phaser/` web + Electron builds (webpack DefinePlugin) | Game-server base URL (default `http://127.0.0.1:8787`) |

Steam (Electron) auth needs `MANA_STEAM_WEB_API_KEY` (server secret) plus the
client defaults — see [auth.md](auth.md) and [game-server.md](game-server.md)
for the full env tables.

## Platform Requirements

- **Node.js**: v22 or higher (`.nvmrc`)
- **npm**: v7 or higher
- **OS**: Windows, macOS, or Linux
