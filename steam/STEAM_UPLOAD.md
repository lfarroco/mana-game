# Steam Upload Guide

This guide covers how to build and upload both the **full game** and **demo
version** to Steam with SteamPipe — the Steamworks build pipeline, no upload
dashboard needed. It mirrors the itch.io flow documented in
[docs/building-and-running.md](../docs/building-and-running.md): one command
does the whole release.

## One-command upload

```bash
make steam-publish         # full game — build (win+mac+linux) + upload → App 3757600
make steam-publish-demo    # demo — build (win+mac+linux) + upload → App 4233280
```

Under the hood: `steam/scripts/publish_steam.sh` (full game) and
`steam/scripts/publish_steam_demo.sh` (a thin `STEAM_DEMO=1` wrapper over the
same script).

Each run, in order:

1. reads the root `.env` (safe parse — only `MANA_SERVER_URL` and
   `STEAM_USERNAME`; the Make-flavored lines are ignored — secrets are never
   read from `.env`),
2. defaults `MANA_SERVER_URL` to `https://us-central1-mana-battle-f3b15.cloudfunctions.net/api` so the build
   bakes the production server URL (a missing value would point multiplayer at
   the player's own machine),
3. runs the phaser unit tests + typecheck (`MANA_SKIP_CHECKS=1` to skip),
4. builds all three Electron platforms (`MANA_SKIP_BUILD=1` to reuse an
   existing `phaser/dist-electron/`),
5. uploads through **steamcmd**.

## Prerequisites

1. **A Steamworks partner account** with access to both apps.
2. **App IDs** — Full Game: `3757600`, Demo: `4233280`.
3. **Docker** (preferred — nothing else to install), or a host `steamcmd`.

### Runner — Docker by default

- **Docker (default)**: steamcmd runs inside the official
  `steamcmd/steamcmd:debian-12` image (pulled on first use; nothing is
  installed on the host). Refresh it anytime with `make steam-cmd-image`.
- **Host**: set `STEAM_CMD=host` and install SteamCMD from
  https://developer.valvesoftware.com/wiki/SteamCMD, making sure `steamcmd` is
  on your PATH.

### Credentials

The upload authenticates with your **Steam account** (the one with Steamworks
permissions). `STEAM_USERNAME` lives in the root `.env` (gitignored, not a
secret). The **password** and the **Steam Guard code** are never stored
anywhere — the script prompts for them on the terminal each run:

```bash
make steam-publish
# Steam username: <taken from .env, or prompted>
# Steam password: (hidden)
# Steam Guard code (Enter to skip):
```

For a non-interactive run (pipe, cron) export them up front instead:

```bash
STEAM_USERNAME=... STEAM_PASSWORD=... STEAM_GUARD_CODE=... make steam-publish
```

> **Security**: nothing secret rests in a file — no cached sessions, no tokens.
> The password is passed on the steamcmd command line (visible in `ps` while
> the upload runs) — the official SteamPipe instructions work the same way —
> but it only ever comes from your keystrokes or a one-shot export.

## Overrides

| Variable             | Default | Meaning |
|----------------------|---------|--------------------------------|
| `STEAM_DEMO=1`       | `0` | Target the demo app (4233280) instead of the full game |
| `STEAM_USERNAME`     | — | Steam account with Steamworks access (may live in `.env`; prompted when unset) |
| `STEAM_PASSWORD`     | — | Account password (prompted when unset; export for non-interactive runs) |
| `STEAM_GUARD_CODE`   | — | Steam Guard / mobile-auth code (prompted; Enter skips; export for non-interactive runs) |
| `STEAM_BUILD_DESC`   | `v<version> — <date>` | Build description shown in Steamworks → Builds |
| `STEAM_CMD`          | `docker` | `host` → use the machine's steamcmd |
| `STEAMCMD_IMAGE`     | `steamcmd/steamcmd:debian-12` | Docker image for the runner |
| `MANA_SKIP_CHECKS=1` | `0` | Skip the pre-push unit tests + typecheck |
| `MANA_SKIP_BUILD=1`  | `0` | Skip the Electron build; upload the existing `dist-electron/` |
| `STEAM_DRY_RUN=1`    | `0` | Print the exact steamcmd command without uploading |

## Steam configuration files

- **App build**: `steam/steam_config/app_build.vdf` (full) /
  `app_build_demo.vdf` (demo). The script copies the relevant one to a
  `*.gen.vdf` (gitignored) with a descriptive `desc`, so Steamworks → Builds
  shows a meaningful name.
- **Depots**: full — `depot_build_win.vdf` (3757602), `depot_build_mac.vdf`
  (3757604), `depot_build_linux.vdf` (3757603); demo —
  `depot_build_demo_win.vdf` (4233282), `depot_build_demo_mac.vdf` (4233283),
  `depot_build_demo_linux.vdf` (4233284).
- steamcmd's content manifests land in `phaser/dist-steam` (full) /
  `phaser/dist-steam-demo` (demo) — both gitignored.

## Publishing the full game

```bash
make steam-publish
```

1. Set `STEAM_USERNAME` in the root `.env`.
2. Run `make steam-publish` (build + upload, all three platforms), typing the
   password + Steam Guard code when prompted.
3. Promote when ready: Steamworks → `3757600` → **Builds** → right-click the
   new build → *Set branch / Release Candidate*.

## Publishing the demo

```bash
make steam-publish-demo
```

Same flow against App `4233280`. The build is made with `IS_DEMO=true`, so the
5-victory limit and the "Buy Full Game" flow are baked in. **Verify locally
first** (`make electron-dev-demo`): no units unlock, no achievements trigger,
the game stops at 5 victories and shows "Demo Complete".

## Non-interactive runs

There is no unattended / CI path anymore — publishing is a local step where
you type the password + Steam Guard code when prompted. (The old cached-session
`config.vdf` flow and the `publish-steam.yml` GitHub workflow were removed:
a fresh runner always looks like a new device to Steam, so a stored session
or a static guard-code secret can't log in reliably. If you still have a
`STEAM_CONFIG_VDF_B64` line in your root `.env`, delete it.)

For a non-interactive invocation (pipe, cron) export the credentials up front:

```bash
STEAM_USERNAME=... STEAM_PASSWORD=... STEAM_GUARD_CODE=... make steam-publish
```

If Steam asks for a new-device code on the first container login, check the
account email and pass the code as `STEAM_GUARD_CODE` (or type it at the
prompt on the next run).

Dry-run first to see the exact command without uploading anything:

```bash
STEAM_DRY_RUN=1 make steam-publish
```

## Troubleshooting

### Build not found / missing depots
The script checks `phaser/dist-electron/{win-unpacked,mac-universal,linux-unpacked}`
before uploading and prints the exact build command if any is missing. Make sure
you didn't use `MANA_SKIP_BUILD=1` against a stale or partial build.

### SteamCMD login issues
- Wrong password / guard code → re-run and type them fresh when prompted.
- New-device email code: first login from a fresh container may ask for a code
  sent to the account email — type it at the `Steam Guard code` prompt (or
  export `STEAM_GUARD_CODE`).
- "Press Enter" Steam Subscriber Agreement prompt: Docker mode auto-answers it.
- No TTY (pipes, cron) → the script can't prompt; export `STEAM_USERNAME` /
  `STEAM_PASSWORD` (+ `STEAM_GUARD_CODE`) up front instead.

### Wrong version uploaded
- **Full game**: make sure you didn't run with `STEAM_DEMO=1`.
- **Demo**: `make steam-publish-demo` sets `STEAM_DEMO=1` for you.
- Check the build's `desc` in Steamworks → Builds.

### Depot IDs don't match
Verify the depot IDs in Steamworks match the VDF files. Full game depots:
3757602 (Win), 3757604 (Mac), 3757603 (Linux). Demo depots: 4233282 (Win),
4233283 (Mac), 4233284 (Linux).

### Run from macOS
The script builds the macOS depot with electron-builder, which can only
produce the mac target on macOS itself (Windows/Linux cross-compile from
anywhere) — run `make steam-publish*` on a Mac.

## Quick reference

| Task                            | Command                       |
|---------------------------------|-------------------------------|
| Build full game (all platforms) | `make electron-build-all`     |
| Build demo (all platforms)      | `make electron-build-demo-all`|
| Upload full game                | `make steam-publish`          |
| Upload demo                     | `make steam-publish-demo`     |
| Test full game locally          | `make electron-dev`           |
| Test demo locally               | `make electron-dev-demo`      |
| Pull the steamcmd Docker image  | `make steam-cmd-image`        |
