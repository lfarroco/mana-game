# Mana Battle — Game Server

Authoritative multiplayer game server for Mana Battle.

## Quick Start

```bash
cd server
npm install
npm run dev        # http://127.0.0.1:8787
npm run test       # jest unit + integration tests
npm run typecheck  # tsc --noEmit
npm run build      # tsup production bundle → dist/
```

## Local multiplayer testing (Steam flow)

One-command local setup for the multiplayer + Steam auth flow — no deploy
needed. The only external call is your server → Steam's `AuthenticateUserTicket`
Web API, which works fine from localhost with your publisher key.

```bash
# 1. From the repo root, create a .env (gitignored) with your publisher key:
echo 'MANA_STEAM_WEB_API_KEY=<your-key>' > .env

# 2. Run the server (dev loop, SQLite-backed, Steam auth enabled):
make server-mp        # Ctrl-C to stop
```

- **URL**: `http://127.0.0.1:8787` — the Steam Electron client's default
  `MANA_SERVER_URL`, so no client config is needed on the same machine.
- **Persistence**: SQLite at `server/data/mana.db` (default), so sessions,
  ghosts, and ratings survive server restarts and accumulate across test
  players — restart-survival and cross-account ghost matchmaking are
  testable locally.
- **Overrides**: same `.env` also supports `MANA_SERVER_PORT`,
  `MANA_STEAM_APP_IDS` (default `3757600,4233280`), `MANA_SQLITE_PATH`.
- **Docker alternative**: `make server-compose-up` (or
  `docker compose up -d --build`) — builds `server/Dockerfile`, maps
  8787, and stores SQLite in the named `mana-data` volume. Compose fails
  fast if `MANA_STEAM_WEB_API_KEY` is missing from `.env`.

Then launch the **Steam Electron build** and click **MULTIPLAYER** on the
title screen. For ghost-PvP, play a few rounds as a second Steam account on
the same server (your own ghosts are excluded from matchmaking, so one
account always fights PvE).

## API (v1)

Base path `/api/v1`, JSON in/out. Every session request must carry a bearer
token in the `Authorization` header — obtain one via `POST /api/v1/auth/steam`
(Steam auto-login, Electron) or `POST /api/v1/auth/itch` (itch.io OAuth, web
build), both of which return `{ player, token }`:

```
Authorization: Bearer <token>
```

Unauthenticated: `GET /health`, `POST /api/v1/auth/steam`,
`POST /api/v1/auth/itch`. Everything else requires a valid (non-expired) token;
missing/malformed tokens → 401 `missing_token`, unknown/expired tokens → 401
`invalid_token`. The `X-Player-Id` header is retired.

| Method | Path                               | Description                                                                     |
| ------ | ---------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/health`                          | Liveness check → `{ ok: true }` (no auth)                                       |
| POST   | `/api/v1/auth/steam`               | Steam ticket → `{ player, token }` (no auth)                                    |
| POST   | `/api/v1/auth/itch`                | itch.io OAuth token → `{ player, token }` (no auth; gated by `MANA_ITCH_ENABLED`) |
| POST   | `/api/v1/sessions`                 | Create session → `SessionData` (409 if an **active** run exists)                |
| GET    | `/api/v1/sessions/current`         | Resume/reconnect → `SessionData` (+ serialized `combatState` while in `combat`); 404 if none or the run has finished |
| POST   | `/api/v1/sessions/current/actions` | Dispatch action → `{ session, combatState? }`                                   |

### Session lifecycle (server-owned)

The **server** decides when a session finishes — the client never does, and
there is **no `DELETE /sessions/current`** endpoint.

- A run finishes when core transitions it to a terminal phase: `end_combat`
  with `losses >= LOSSES_TO_GAME_OVER` → `game_over` (0 lives left), or
  `wins >= WINS_TO_WIN_GAME` → `victory`.
- The terminal session is returned **once**, in the action response of the
  `end_combat` that ended the run — the client renders the game-over/victory
  screen from that payload.
- From then on the run is finished: `GET /sessions/current` → 404
  `no_active_session`, further actions → 409 `session_finished`, and
  `POST /sessions` succeeds again (the finished run is superseded — the player
  can only create a new session).

### Create session body

```json
{
  "crystalId": "critical_crystal",
  "queueType": "ranked" // optional: "casual" (default) | "ranked"
}
```

- `crystalId` is **required** — every run starts with a core crystal. The id
  must be a known core card id (`mana_crystal`, `critical_crystal`,
  `protective_crystal`, `growth_crystal`, `purple_crystal`, …).
- The server generates the session seed (it is the replay authority) and marks
  the session as `session_type: { type: "multiplayer", queueType }`.
- One active session per player: creating a second returns **409** while a
  run is still active. A finished run (`victory` / `game_over`) does **not**
  block a new session — the server owns the lifecycle and supersedes it (see
  [Session lifecycle (server-owned)](#session-lifecycle-server-owned)).
- Actions on a finished session (`victory` / `game_over`) return **409**.

### Dispatch action body

```json
{
  "action": { "type": "start_combat" },
  "clientActionId": "optional-idempotency-key"
}
```

Supported action types: `skip`, `select_encounter`, `recruit_unit`,
`discard_unit`, `update_team`, `apply_orb`, `increase_core_max_life`,
`upgrade_core_power`, `decrease_core_cooldown`, `start_combat`, `end_combat`,
`victory`.

`start_combat` runs the combat simulation server-side and returns the result as
a JSON-safe `CombatStateDto` (`units`, `logs`, `wonCombat`,
`finalPlayerUnits`, `enemyPlayerName`) — the raw in-memory `CombatState`
(contains a `Map`) is never sent. The client decodes it with the core
`CombatCodec`.

## Matchmaking & rating

Async "ghost" PvP (docs/game-server.md) — no real-time coordination, opponents
always available:

- **Ghost snapshot** — every `start_combat` snapshots the player's board team
  as a ghost for the current round (`{ playerId, sessionId, round, team,
  rating, createdAt }`). Teams are sanitized at snapshot time (positions
  clamped to the 3×3 board, CPU force, full life) so they are always
  combat-ready when picked.
- **Opponent pick** — the closest-rated ghost of the same round within a
  rating band (start ±150), widening by +150 per miss (up to 3 steps).
  Self and recently-fought players are excluded; the recently-fought log is a
  capped per-player FIFO (20) on the ghost repo. Picks are deterministic
  (closest rating, then lowest rating, then player id).
- **PvE fallback** — when no ghost qualifies, the enemy is generated via
  `EnemyGeneration.generateEnemyTeamForRound(round, wins, seed)` and the
  `enemyPlayerName` is `"PvE"` — a match is always guaranteed.
- **Matchup record** — each `start_combat` action-log entry carries a
  `payload: { enemyPlayerName, ghostId, opponentPlayerId }` (nulls = PvE), so
  the session log doubles as the run's matchup history.
- **Rating** — players start at 1000 (initialized on first session creation).
  On run completion (`victory` / `game_over`) a wins-based delta is applied
  exactly once: gold 6 (10+ wins), silver 4 (8–9), bronze 2 (5–7), otherwise 1
  (ported from the retired Supabase `multiplayer-rating.ts`).

### Error responses

All errors are `{ "error": "<code>", "message": "..." }`:

| Status | Code                                        | Meaning                                             |
| ------ | ------------------------------------------- | --------------------------------------------------- |
| 400    | `invalid_crystal_id`                        | Missing/unknown `crystalId`                         |
| 400    | `invalid_queue_type`                        | `queueType` not `casual`/`ranked`                   |
| 400    | `invalid_action` / `invalid_action_type`    | Malformed or unknown action                         |
| 400    | `invalid_steam_ticket` / `invalid_itch_token` / `invalid_identity` | Malformed auth body |
| 401    | `missing_token`                             | Missing/malformed `Authorization` header            |
| 401    | `invalid_token`                             | Unknown or expired bearer token                     |
| 401    | `invalid_steam_ticket` / `invalid_itch_token` / `invalid_identity` | Provider rejected the credential (Steam ticket / itch token / identity or appId) |
| 404    | `no_active_session`                         | No session for this player                          |
| 409    | `session_already_exists`                    | A session is already active                         |
| 409    | `session_finished`                          | Run already ended (`victory`/`game_over`)           |
| 422    | `action_rejected`                           | Action invalid for the current phase                |
| 429    | `rate_limited`                              | Per-IP auth rate limit exceeded (`POST /auth/steam`, `POST /auth/itch`)  |
| 500    | `internal_error`                            | Unexpected server error                             |

## Environment

| Variable                 | Default       | Description                                                       |
| ------------------------ | ------------- | ----------------------------------------------------------------- |
| `MANA_SERVER_HOST`       | `127.0.0.1`   | Bind address (use `0.0.0.0` in Docker/VPS)                        |
| `MANA_SERVER_PORT`       | `8787`        | Bind port                                                         |
| `MANA_CORS_ORIGIN`       | `*`           | Allowed CORS origin(s): `*` or a comma-separated list             |
| `MANA_NODE_ENV`          | `development` | Runtime environment                                               |
| `MANA_STEAM_WEB_API_KEY` | —             | Steam Web API key (standard or publisher; server secret; enables `POST /auth/steam`) |
| `MANA_STEAM_APP_IDS`     | `3757600`     | Comma-separated Steam app-id allowlist                            |
| `MANA_STEAM_API_URL`     | public endpoint | `AuthenticateUserTicket` endpoint. The server code defaults to `https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/` (needs a **publisher** key), but `compose.yaml` and `.env.example` set `https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/` so a standard Web API key (`steamcommunity.com/dev/apikey`) works (rate-limited). Override in `.env` to switch. |
| `MANA_ITCH_ENABLED`      | `false`        | `true` registers `POST /api/v1/auth/itch` (web build's itch.io OAuth login) |
| `MANA_TOKEN_TTL_DAYS`    | `30`          | Bearer token lifetime (days)                                      |
| `MANA_AUTH_RATE_LIMIT_MAX` | `20`        | Per-IP request cap per window for the auth endpoints (`POST /auth/steam`, `POST /auth/itch`) |
| `MANA_AUTH_RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (ms) for the auth endpoints              |
| `MANA_SQLITE_PATH`     | —             | Opt into durable SQLite persistence (a database file path or `:memory:`); unset = in-memory repos |

## Persistence (Phase 4)

Persistence is behind repository interfaces (`src/persistence/repositories.ts`)
with two implementations: in-memory (`memory.ts`, the **default**) and durable
SQLite via `better-sqlite3` (`sqlite.ts`).

**Selection logic**: set `MANA_SQLITE_PATH` to a database file path (parent
directory is auto-created, WAL journaling enabled) or `:memory:` to boot all
five repos on SQLite. When unset, the server uses the in-memory repos
(existing behavior — restarting loses active sessions). `createApp` accepts a
`sqlitePath` dep (individual `*Repo` deps override the SQLite default per
repo), and `src/index.ts` wires `config.sqlitePath`.

```
MANA_SQLITE_PATH=./data/mana.db npm start   # durable file-backed persistence
MANA_SQLITE_PATH=:memory: npm start          # throwaway in-memory SQLite
npm start                                    # in-memory repos (default)
```

Schema (idempotent `CREATE TABLE IF NOT EXISTS`, created on boot):
`players`, `tokens`, `sessions` (`SessionData` as JSON), `combat_states`
(`CombatStateDto` via the core `CombatCodec` — the live `SessionData.combatState`
carries a `Map` that plain JSON cannot hold, so it is stored separately and
re-attached on load), `ghosts` + `recently_fought` (capped FIFO), `ratings`.
Session + combat rows are written in a single transaction; a kill/restart
mid-run resumes via `GET /sessions/current` with the combat state intact
(restart-survival test in `test/sqlite.test.ts`).

## Deployment (Ubuntu VM)

The `Dockerfile` bundles the server **and** the `core/` game logic into a single
image (core is inlined at build time via the `@game/*` esbuild alias). There are
two supported VM paths: **`docker compose`** (below) and a **bare systemd
install** (no Docker) for tiny VMs.

### Docker flow: `docker compose` on the VM

The root `compose.yaml` is the supported production entry point. It sets
`MANA_SQLITE_PATH=/data/mana.db` on the named `mana-data` volume, enables the
health check, and restarts on crash/reboot.

**Fresh VM?** Run the one-shot bootstrap — it installs Docker Engine + the
compose plugin, creates `.env` from `.env.example` (fill in the key and
re-run), opens 22/80/443 via ufw, and runs the first deploy:

```bash
git clone git@github.com:lfarroco/mana-game.git /opt/mana-game   # private repo → SSH deploy key or PAT
cd /opt/mana-game
./server/scripts/setup-docker.sh            # --domain api.manabattle.com [--no-firewall]
```

The manual steps below are what the script automates (keep them in mind for the
one-time `.env` contents and cloud-firewall configuration):

1. **Create an Ubuntu 24.04 VM** (1 GB is plenty for Node + SQLite — the
   $4 512 MB size can OOM during `npm install`/`tsup` in the Docker build; add
   a 1 GB swap file or use the 1 GB size) and install Docker Engine + the
   compose plugin. Add your deploy user to the
   `docker` group (`sudo usermod -aG docker $USER`) and enable Docker on boot
   (`sudo systemctl enable --now docker`).
2. **Clone the repo** — it is private, so add an SSH deploy key or use HTTPS
   with a fine-grained PAT:
   ```bash
   git clone git@github.com:lfarroco/mana-game.git /opt/mana-game
   ```
3. **Create `/opt/mana-game/.env`** (gitignored) with your secrets:

   | Var | Value |
   |---|---|
   | `MANA_STEAM_WEB_API_KEY` | required — Steam Web API key (standard from `steamcommunity.com/dev/apikey`, or a publisher key) — registers `POST /auth/steam` |
   | `MANA_STEAM_APP_IDS` | default `3757600,4233280` |
   | `MANA_STEAM_API_URL` | default `https://api.steampowered.com/...` (standard key); set to the partner endpoint only when using a publisher key |
   | `MANA_ITCH_ENABLED` | `true` if the itch.io web build should log in (`POST /auth/itch`) |
   | `MANA_CORS_ORIGIN` | `https://html-classic.itch.zone,https://lfarroco.itch.io` for the web build (the embedded game fetches from the iframe origin `https://html-classic.itch.zone`) |
   | `MANA_SERVER_PORT` | host port, default `8787` |

   > **Gotcha:** the server container only receives the vars whitelisted in
   > `compose.yaml`'s `environment:` block. A new `MANA_*` var in `.env` is
   > silently ignored unless you add it there too (this bit us with
   > `MANA_STEAM_API_URL` on 2026-08-24).

4. **Build + start** (the script does `git pull --ff-only`, fails fast on the
   missing Steam key, `docker compose up -d --build`, then waits for `/health`):
   ```bash
   cd /opt/mana-game
   ./server/scripts/deploy.sh
   curl http://127.0.0.1:8787/health   # → {"ok":true}
   ```
5. **Back up on a schedule** (cron):
   ```bash
   0 3 * * * /opt/mana-game/server/scripts/backup.sh --keep 14
   ```
   Each run writes a crash-consistent snapshot (better-sqlite3 online backup
   API — safe under WAL) to `server/data/backups/mana-<ts>.db` on the host.
   Set `BACKUP_DEST` (e.g. an `rclone` remote pointing at DO Spaces) for an
   off-box copy. Restore = stop the server, copy the snapshot over
   `/data/mana.db`, start again.

6. **HTTPS via Caddy (bundled in the compose stack)**: `compose.yaml` runs a
   `caddy` service on 80/443 that terminates TLS (automatic Let's Encrypt)
   and reverse-proxies to `server:8787` — no Caddy install on the host. This
   is the topology the server's trust-proxy config was written for
   (`player ──https──▶ Cloudflare ──https──▶ Caddy ──▶ server:8787`).
   - Point `api.manabattle.com` at the VM's public IP, **proxied** by
     Cloudflare (orange cloud).
   - Cloudflare **SSL/TLS → Overview**: mode **Full (strict)** (CF re-encrypts
     to Caddy, which serves a valid Let's Encrypt cert). Do **not** use
     Flexible.
   - **Delete any Cloudflare origin rule** that overrides the destination
     port to 8787 — CF must reach Caddy on 443.
   - Open **80** (ACME HTTP-01) and **443** in the VCN security list; the
     server's own 8787 is bound to `127.0.0.1` (host-only).
   - `./server/scripts/deploy.sh` builds and starts both services and waits
     for the internal health check. Verify end-to-end:
     `curl https://api.manabattle.com/health` → `{"ok":true}`.
   - If the first Let's Encrypt issuance stalls behind Cloudflare, grey-cloud
     the DNS record for a minute so HTTP-01 can reach Caddy directly, then
     re-proxy.

**Redeploy** is just `./server/scripts/deploy.sh` again — the `mana-data`
volume keeps sessions, ghosts, ratings, and players across rebuilds.
Maintenance from your machine (see the Makefile): `make cloud-deploy`,
`make cloud-logs`, `make cloud-db-download`, `make cloud-db` (browse a
snapshot), `make cloud-db-summary`. All the `cloud-*` targets are
provider-agnostic — set `MANA_CLOUD` (e.g. `root@<vm-ip>`) in `.env`.

> ⚠️ **Data survival rules**
> - `docker compose up -d --build` and `docker compose down` keep `mana-data`.
> - `docker compose down -v` or `docker volume rm` **destroys it permanently**.
> - Bare `docker run` without `MANA_SQLITE_PATH` = **in-memory repos** —
>   every restart loses everything. `compose.yaml` always sets it; do not
>   bypass compose without it.
> - SQLite means **one container**: never run two server replicas against the
>   same `.db` file.

### Switching providers / migrating to a fresh VM

The deployment is provider-agnostic — moving to a new cloud is a few steps and
the only data that matters is the SQLite DB:

1. **Back up the old VM** — on the current box (or `make cloud-db-download`
   from your machine):
   ```bash
   cd /opt/mana-game && ./server/scripts/backup.sh --keep 1
   ```
   then copy `server/data/backups/mana-*.db` somewhere safe.
2. **Create the new VM** on any provider. Add the DNS record last.
3. **Bootstrap it** (Docker + compose plugin, `.env`, ufw, first deploy):
   ```bash
   git clone git@github.com:lfarroco/mana-game.git /opt/mana-game
   cd /opt/mana-game
   ./server/scripts/setup-docker.sh --no-firewall   # 22/80/443 via the cloud security list
   ```
4. **Restore the database** — stop the stack, drop the snapshot into the
   `mana-game_mana-data` volume, start again:
   ```bash
   docker compose down
   docker run --rm -v mana-game_mana-data:/data -v "$PWD/mana-<ts>.db":/restore.db:ro \
     alpine sh -c 'cp /restore.db /data/mana.db && chown 1000:1000 /data/mana.db'
   docker compose up -d --build
   ```
5. **Flip DNS/Cloudflare** to the new VM's IP (SSL mode stays **Full
   (strict)** — Caddy re-issues the Let's Encrypt cert automatically on the new
   host), then verify:
   ```bash
   curl https://api.manabattle.com/health   # → {"ok":true}
   ```

> The `mana-data` volume itself is also portable (`docker run --rm -v
> mana-game_mana-data:/data -v $PWD:/backup alpine tar czf /backup/mana-data.tgz -C /data .`
> → unpack on the new box), but snapshot-restore (step 4) is the simpler and
> safer path — use the volume tarball only when you want the exact volume
> contents (e.g. the in-volume `backups/` copies).

### Bare systemd flow (no Docker)

For a small VM (e.g. the $4 512 MB size) running a single Node process,
Docker overhead isn't worth it. The server already ships as one bundled file
(`npm run build` → `dist/index.js` with `core/` inlined), and systemd does the
supervision. There is no dotenv — config reads `process.env`, so the unit
loads an `EnvironmentFile`.

**One-shot setup** (recommended): clone the repo, point a DNS record at the
VM, then run as root:

```bash
git clone git@github.com:lfarroco/mana-game.git /opt/mana-game
cd /opt/mana-game
./server/scripts/setup-bare.sh            # --domain api.manabattle.com [--no-firewall]
```

`setup-bare.sh` is idempotent — it checks the VM and installs whatever is
missing: `curl`/`git`/`ca-certificates`, **Node ≥ 22** (NodeSource), **Caddy**
(TLS on 80/443 → `127.0.0.1:8787`), the `managame` service user, the ufw
firewall (22/80/443), and the `server/Caddyfile` template rendered to
`/etc/caddy/Caddyfile`. If `.env` doesn't exist it is created from
`.env.example` (bare `KEY=value`, **no quotes, no `export`** — systemd's
`EnvironmentFile` parser) and the script exits so you can fill in
`MANA_STEAM_WEB_API_KEY` and re-run. Finally it runs `deploy-bare.sh --build`
(first build + systemd unit + `/health` wait). Add a 1 GB swap file first on a
512 MB box, or skip `--build` and rsync `dist/` from your machine instead.

After the one-shot setup, the DB lives at `server/data/mana.db` on the host
filesystem and survives every redeploy. **Subsequent deploys** — build dist/
on your dev machine, rsync it over, then:

```bash
cd /opt/mana-game
./server/scripts/deploy-bare.sh    # git pull + npm ci --omit=dev + restart
```

**Back up on a schedule** (cron):

```bash
0 3 * * * /opt/mana-game/server/scripts/backup-bare.sh --keep 14
```

Writes a crash-consistent snapshot (better-sqlite3 online backup API) to
`server/data/backups/mana-<ts>.db`. Restore = stop the service, copy the
snapshot over `server/data/mana.db`, `systemctl start mana-server`.

Useful commands: `systemctl status mana-server`, `journalctl -u mana-server -f`,
`systemctl restart mana-server`.

### HTTPS, TLS, and pointing clients at the VM

The itch.io game page is served over HTTPS; browsers block mixed content, so
the web build's API URL must be `https://…`. The bare setup uses **Caddy**
(auto Let's Encrypt certs) via `server/Caddyfile` → `/etc/caddy/Caddyfile`
(`reverse_proxy 127.0.0.1:8787`). The DNS record can be DNS-only (grey cloud);
if the record is proxied by Cloudflare, keep SSL mode at "Full (strict)". The
Steam Electron build works over plain HTTP too, but pointing it at the same
`https://` URL keeps one config for both.

- **Clients are built with `MANA_SERVER_URL`** (webpack DefinePlugin; empty
  string falls back to `http://127.0.0.1:8787`). Point both builds at the
  VM, e.g.:
  ```bash
  MANA_SERVER_URL=https://api.manabattle.com npm run build
  ```
- **The server resolves the real client IP through both proxies**
  (`src/trustProxy.ts` → `app.set("trust proxy", ["loopback", …Cloudflare
  ranges])`). With the Cloudflare → Caddy → :8787 chain, each hop appends to
  `X-Forwarded-For`; trusting loopback (Caddy) **and** Cloudflare's published
  edge ranges lets `req.ip` walk past the CF edge IP to the actual player, so
  the auth rate limiter keys per player instead of per Cloudflare PoP. The
  rightmost untrusted hop always wins, so fabricated `X-Forwarded-For` can't
  bypass the limiter — and :8787 is firewalled to localhost anyway (ufw).
  Refresh the range list from `https://www.cloudflare.com/ips` when Cloudflare
  announces changes (see the comment in `src/trustProxy.ts`).
- **CORS stays `*`** — it reflects the *page* origin (the itch.io game page),
  not the API host, so the domain change doesn't affect it.

### Bare `docker run` (manual alternative)

```bash
# from the repo root
docker build -f server/Dockerfile -t mana-server .

# run (port 8787 exposed; SQLite MUST be on a persistent volume)
docker run -d --name mana-server -p 8787:8787 \
  -e MANA_SERVER_HOST=0.0.0.0 \
  -e MANA_SQLITE_PATH=/data/mana.db \
  -v mana-data:/data \
  -e MANA_CORS_ORIGIN="https://your-app.example" \
  mana-server

# health check
curl http://127.0.0.1:8787/health
```

### Notes

- Persistence is **in-memory by default** (restarts lose active sessions);
  set `MANA_SQLITE_PATH` for durable SQLite persistence (see above). The
  SQLite file should live on a persistent volume in production.
- Auth: Steam (`POST /api/v1/auth/steam`) + itch.io (`POST /api/v1/auth/itch`,
  gated by `MANA_ITCH_ENABLED`); bearer tokens are stored
  SHA-256-hashed with an expiry. The auth endpoints are rate-limited per-IP
  (`express-rate-limit`, `MANA_AUTH_RATE_LIMIT_MAX` / window) to prevent ticket
  grinding. Guest accounts are a future phase.
- `better-sqlite3` v13 ships prebuilt NAPI binaries in the npm tarball
  (glibc **and** musl, x64 + arm64) — the alpine runtime image needs no build
  tools (verified 2026-08-20).
- `clientActionId` is accepted for forward-compatibility but idempotent
  retries are not yet implemented.
