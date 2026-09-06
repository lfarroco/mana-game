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

1. reads the root `.env` (safe parse — only `MANA_SERVER_URL`, `STEAM_USERNAME`,
   `STEAM_PASSWORD`, `STEAM_GUARD_CODE`, `STEAM_CONFIG_VDF`, `STEAM_CONFIG_VDF_B64`;
   the Make-flavored lines are ignored),
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
permissions). Set these in the root `.env` (gitignored) or the environment:

| Variable            | Required       | Meaning                        |
|---------------------|----------------|--------------------------------|
| `STEAM_USERNAME`    | ✅             | Steam account name             |
| `STEAM_PASSWORD`    | Docker / CI    | Account password               |
| `STEAM_GUARD_CODE`  | 2FA accounts   | Steam Guard / mobile-auth code |

**Fully unattended (no MFA prompts)** — instead of a password, point the script
at a **cached Steam login** (a `config.vdf` from a machine where you logged in
once — see [Automated / CI](#automated--ci-no-mfa-prompts)). Set
`STEAM_CONFIG_VDF` (file path) or `STEAM_CONFIG_VDF_B64` (base64 content, e.g. a
CI secret). When either is set, `STEAM_PASSWORD`/`STEAM_GUARD_CODE` are not
required.

Docker mode is non-interactive (no TTY), so with credentials it needs
`STEAM_PASSWORD` — and `STEAM_GUARD_CODE` when the account uses two-factor auth.
Host mode can be interactive: leave the password unset and steamcmd prompts on
the terminal.

> **Security**: never commit real credentials. The password is passed on the
> steamcmd command line (visible in `ps` while the upload runs) — the official
> SteamPipe instructions work the same way. Prefer the interactive host mode
> locally and env vars in CI.

## Overrides

| Variable             | Default | Meaning |
|----------------------|---------|--------------------------------|
| `STEAM_DEMO=1`       | `0` | Target the demo app (4233280) instead of the full game |
| `STEAM_USERNAME`     | — | Steam account with Steamworks access (required) |
| `STEAM_PASSWORD`     | — | Account password (credential auth) |
| `STEAM_GUARD_CODE`   | — | Steam Guard / mobile-auth code (2FA accounts) |
| `STEAM_CONFIG_VDF`   | — | Path to a config.vdf with a cached Steam login (no MFA) |
| `STEAM_CONFIG_VDF_B64` | — | Base64-encoded config.vdf content (CI secrets); when both are set, B64 wins |
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

1. Set `STEAM_USERNAME` (+ `STEAM_PASSWORD`/`STEAM_GUARD_CODE`) in the root `.env`.
2. Run `make steam-publish` (build + upload, all three platforms).
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

## Automated / CI (no MFA prompts)

Fully unattended uploads (GitHub Actions, cron, tag pushes) are possible because
steamcmd can reuse a **cached login session** — the same mechanism that lets the
Steam client auto-log-in. No TOTP extraction or rooted phones involved.

### 1. Dedicated build account

Create a separate Steam account for publishing (don't use your personal admin
account). In Steamworks → **Users & Permissions**, add it with **Edit App
Metadata** and **Publish App Changes to Customers** for the game + demo apps
(see the [official uploading docs](https://partner.steamgames.com/doc/sdk/uploading#Build_Account)).
This account's username is the `STEAM_USERNAME` everywhere.

### 2. Generate the cached session (config.vdf) once

> **Must be generated by steamcmd** — the Steam *desktop client's* config.vdf
> does NOT contain the cached-credential block steamcmd needs (no `"accounts"`
> section), so encoding it won't work. Close the Steam desktop client first
> (both write the same `config.vdf` file), then log in once with steamcmd:

```bash
steamcmd +login <build_account> +quit
```

Type the password, then the emailed Steam Guard code when asked. That login is
persisted to a `config.vdf` — encode it:

```bash
# macOS
cat "$HOME/Library/Application Support/Steam/config/config.vdf" | base64
# Linux
cat "$HOME/.local/share/Steam/config/config.vdf" | base64
```

The encoded blob is an auth token — store it only in a secrets manager, never in
the repo, and rotate it periodically or if it leaks.

### 3. GitHub Actions

The repo ships `.github/workflows/publish-steam.yml` — a manual
`workflow_dispatch` with an `app` choice (`demo`/`full`) plus an optional
version. Set these repository secrets (**Settings → Secrets and variables →
Actions**):

| Secret              | Value |
|---------------------|-------|
| `STEAM_USERNAME`    | the build account's Steam username |
| `STEAM_CONFIG_VDF`  | the base64 from step 2 |
| `MANA_SERVER_URL`   | optional — defaults to `https://us-central1-mana-battle-f3b15.cloudfunctions.net/api` |

Then **Actions → Publish to Steam → Run workflow** → pick `demo` or `full`. Job
1 builds win/mac/linux on macOS; job 2 uploads on Ubuntu through the Docker
steamcmd runner with the config.vdf mounted into the container — no prompts
anywhere.

### 4. Refreshing the session

When the cached token expires (steamcmd prints `FAILED (License expired)` or
requests a new MFA code):

1. `steamcmd +login <build_account> <password> +quit` locally,
2. enter the new emailed code,
3. re-encode the config.vdf and update the `STEAM_CONFIG_VDF` secret.

### Local unattended run (no GitHub needed)

The same no-MFA flow runs from your machine — no GitHub Actions involved:

```bash
make steam-config-vdf              # encode the steamcmd session into .env
STEAM_CMD=host make steam-publish  # full game — build + upload, no prompts
```

`make steam-config-vdf` runs `steam/scripts/encode_config_vdf.sh --update-env`,
which base64-encodes the steamcmd-generated `config.vdf` on this machine (macOS:
`~/Library/Application Support/Steam/config/config.vdf`) into
`STEAM_CONFIG_VDF_B64` in the root `.env`. The publish script then logs in with
that cached session — no password or MFA prompts.

Prefer `STEAM_CMD=host` locally: the session was created on this machine, so
Steam never treats it as a new device. The default Docker runner works the same
way (and is what CI uses); if Steam asks for a new-device code on the first
container login, refresh the session (§4) or use `STEAM_CMD=host`.

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
- Wrong password / guard code → double-check `STEAM_PASSWORD` / `STEAM_GUARD_CODE`.
- New-device email code: first login from a fresh container may ask for a code
  sent to the account email — put it in `STEAM_GUARD_CODE`.
- "Press Enter" Steam Subscriber Agreement prompt: Docker mode auto-answers it.
- Password missing in Docker mode → the script errors with instructions (set
  the env vars, or use `STEAM_CMD=host` for an interactive login).

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
cross-compile Windows/Linux from macOS — run `make steam-publish*` on a Mac
(the GitHub Actions workflow builds on a macOS runner for you).

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
