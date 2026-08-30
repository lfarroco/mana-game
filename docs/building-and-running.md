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
| `make steam-publish`      | Build desktop app (win/mac/linux) + upload to Steam (Docker steamcmd) |
| `make steam-publish-demo` | Build demo (win/mac/linux) + upload to Steam               |
| `make steam-config-vdf`   | Encode the locally-cached Steam session into `.env` (unattended uploads) |
| `make steam-cmd-image`    | Pull the official steamcmd Docker image                    |
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
> (and `MANA_ITCH_CLIENT_ID` / `MANA_GOOGLE_CLIENT_ID` for the web/Android
> builds) are compile-time `DefinePlugin` values — if unset, the client falls
> back to `http://127.0.0.1:8787` (the player's own machine) / disables the
> corresponding login. The webpack production build warns loudly when any is
> missing. The Makefile sources the root `.env`
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

### Steam upload (automated)

```bash
make steam-publish         # full game (App 3757600)
make steam-publish-demo    # demo (App 4233280)
```

Builds the production Electron app for all platforms (Windows/macOS/Linux) and
pushes it to Steam with **steamcmd** (SteamPipe) — no upload dashboard needed.
Under the hood: `steam/scripts/publish_steam.sh` (the targets are thin
wrappers; `publish_steam_demo.sh` just sets `STEAM_DEMO=1`).

- **Runner**: the official `steamcmd/steamcmd:debian-12` **Docker** image
  (pulled on first use — **nothing is installed on the host**). Force the host
  `steamcmd` with `STEAM_CMD=host`. Refresh the image with `make steam-cmd-image`.
- **Credentials**: `STEAM_USERNAME` is required. Two auth modes:
  - **Credentials** — `STEAM_PASSWORD` (+ `STEAM_GUARD_CODE` for 2FA). Docker
    mode is non-interactive, so it needs them in the environment/`.env`; host
    mode can prompt interactively instead.
  - **Cached session (fully unattended, no MFA)** — set `STEAM_CONFIG_VDF`
    (file path) or `STEAM_CONFIG_VDF_B64` (base64 content, e.g. a CI secret) to
    a `config.vdf` from a machine where you logged in once. Used by the
    GitHub Actions workflow.
- The script reads the root `.env` (safe parse — only `MANA_SERVER_URL`,
  `STEAM_USERNAME`, `STEAM_PASSWORD`, `STEAM_GUARD_CODE`, `STEAM_CONFIG_VDF`,
  `STEAM_CONFIG_VDF_B64`) and defaults
  `MANA_SERVER_URL` to the production value, so the pushed build always has
  working multiplayer. It also runs `test:unit` + `typecheck` before building.
- Each push gets a descriptive build name (`v<version> — <date>`, override
  `STEAM_BUILD_DESC`) visible in Steamworks → Builds. Builds are **not** set
  live automatically — promote them in Steamworks.
- **CI/CD**: `.github/workflows/publish-steam.yml` runs the same flow
  (build on macOS → upload on Ubuntu via Docker, cached-session auth, no MFA).
  Set `STEAM_USERNAME` + `STEAM_CONFIG_VDF` repo secrets and run it from the
  Actions tab.
- Overrides: `MANA_SKIP_CHECKS=1` (skip pre-push checks),
  `MANA_SKIP_BUILD=1` (upload the existing `dist-electron/` without rebuilding),
  `STEAM_CMD=host`, `STEAMCMD_IMAGE`, `STEAM_BUILD_DESC`, `STEAM_DRY_RUN=1`
  (print the exact steamcmd command without uploading). Full guide + env table:
  [steam/STEAM_UPLOAD.md](../steam/STEAM_UPLOAD.md).

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

### Android Build (Capacitor)

```bash
make android-build      # cd phaser && npm run build && npx cap sync android
make android-open       # open the project in Android Studio
```

- `make android-build` defaults `MANA_SERVER_URL` to `https://api.manabattle.com`
  and bakes `MANA_GOOGLE_CLIENT_ID` / `MANA_ITCH_CLIENT_ID` from the root
  `.env` (webpack `DefinePlugin` — a missing Google client id is warned about).
- Multiplayer on Android uses **Google sign-in** (or itch.io) through the
  system browser + the game server's OAuth relay page + a `com.manabattle.app://`
  deep link — full spec: [android-multiplayer.md](android-multiplayer.md).
- One-time human setup before the first live login: create the Google Cloud
  OAuth client id, register `https://api.manabattle.com/oauth/callback` as a
  redirect URI in Google Cloud **and** the itch.io OAuth app, and set
  `MANA_GOOGLE_ENABLED=true` + `MANA_GOOGLE_CLIENT_ID` server-side.

### Server

```bash
cd server
npm run build          # tsup bundle → dist/
make server-build      # or the Docker image
```

### Multiplayer auth configuration (web + Android builds)

itch.io browser players log in via the itch.io OAuth popup (see
[itchio-auth.md](itchio-auth.md)); Android players use Google or itch.io via
the system browser + relay deep link (see
[android-multiplayer.md](android-multiplayer.md)). The relevant env vars:

| Var | Where | Meaning |
|---|---|---|
| `MANA_ITCH_CLIENT_ID` | `phaser/` web build (webpack DefinePlugin) | Public itch.io OAuth client id; empty → browser multiplayer shows "itch auth not configured" |
| `MANA_GOOGLE_CLIENT_ID` | `phaser/` web + Android builds (webpack DefinePlugin) + `server/` | Public Google OAuth client id; empty → Google sign-in hidden/disabled |
| `MANA_ITCH_ENABLED` | `server/` | `true` registers `POST /api/v1/auth/itch` (default `false`) |
| `MANA_GOOGLE_ENABLED` | `server/` | `true` (with `MANA_GOOGLE_CLIENT_ID`) registers `POST /api/v1/auth/google` (default `false`) |
| `MANA_CORS_ORIGIN` | `server/` | Allow the itch.io origins in production: `https://html-classic.itch.zone` (the game iframe origin — what the embedded game sends) and `https://lfarroco.itch.io`, comma-separated. `*` today also covers the Android WebView origin (`https://localhost`) — add it explicitly if the list is ever narrowed |
| `MANA_SERVER_URL` | `phaser/` web + Electron + Android builds (webpack DefinePlugin) | Game-server base URL (default `http://127.0.0.1:8787`); also derives the OAuth relay page URL (`<server>/oauth/callback`) |

Steam (Electron) auth needs `MANA_STEAM_WEB_API_KEY` (server secret) plus the
client defaults — see [auth.md](auth.md) and [game-server.md](game-server.md)
for the full env tables.

## Platform Requirements

- **Node.js**: v22 or higher (`.nvmrc`)
- **npm**: v7 or higher
- **OS**: Windows, macOS, or Linux
