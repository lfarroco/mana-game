# Firebase backend — migration from the Oracle VM deployment

**Status**: 🟡 code complete + emulator-verified, not yet deployed —
Phases F1 + F2 landed and proven locally (see Verification below). Project:
`mana-battle-f3b15`, Firestore `nam5`, functions region `us-central1` (the
code default; nam5 is a Firestore multi-region, functions need a single
region — override with `MANA_FUNCTIONS_REGION`). The VM deployment
(`compose.yaml`, `server/scripts/deploy.sh`) remains the production path
until first deploy + client switch land.

**Decisions** (2026-09-04): Express app wrapped in one 2nd-gen HTTPS function
(`onRequest`, smallest diff, same client contract); Firestore replaces
better-sqlite3 (ephemeral disk + scale-out rule out SQLite on Functions);
keep the Steam/itch.io/Google + Bearer [REDACTED] auth model (Steam has no Firebase
provider; no client auth changes). No data migration — fresh Firestore
datasets; the VM's SQLite DB stays archived, not imported.

## Architecture

```
player ──https──▶ Cloud Functions `api` (2nd gen, runs dist/functions.cjs)
                      │  Express app: server/src/app.ts (unchanged)
                      │  auth: Steam/itch/Google verification + Bearer [REDACTED]
                      ▼
                   Firestore (Native mode) — all repos
```

- One function serves **all** routes (`/health`, `/oauth/callback`,
  `/api/v1/auth/*`, `/api/v1/sessions/*`, `/api/v1/players/*`) — the client
  contract is byte-identical to the VM's, so `RemoteServer.ts` only needs a
  new base URL.
- No Caddy, no Cloudflare, no SSH: TLS + reverse proxying come from Google's
  frontend. `MANA_CORS_ORIGIN` still gates browser/itch.io origins.
- `server/src/functions.ts` is the entry (`api`); `firebase.json` points at
  `server/` with `main: dist/functions.cjs` (CommonJS so the functions
  framework can `require()` it despite the package's ESM type) and a
  predeploy `npm --prefix server run build` (tsup inlines `core/` via the
  `@game/*` alias, same as the VM bundle).

## Phase F1 — Functions hosting slice ✅ landed

- `server/src/functions.ts` — lazy per-instance Express app + `api` trigger
  (`MANA_FUNCTIONS_REGION`, default `us-central1`).
- `server/tsup.config.ts` — second bundle `dist/functions.cjs`.
- `firebase.json` — functions codebase `server/`.
- `server/src/functions.test.ts` — trigger exists + `/health` smoke test.
- `npm run deploy:functions` (in `server/`) — requires `firebase-tools`
  (`npm i -g firebase-tools`) and a project (`--project <id>` or
  `firebase use --add`, which writes the gitignored `.firebaserc` — no
  project id exists yet).

F1 still boots the **in-memory repos by default**: fine for the emulator and
for proving the HTTP path, **not** for production (state is lost between
invocations and diverges across instances).

## Phase F2 — Firestore persistence ✅ landed

All seven repos (`session`, `player`, `token`, `ghost`, `rating`,
`playerStats`, `idempotency`) now have async interfaces and three backends:
memory (tests/dev default), SQLite (VM path, unchanged behavior), Firestore
(`server/src/persistence/firestore.ts` — the Functions production path).
`await` is threaded through services → routes → auth middleware, and the
full suite (298 tests, incl. a Firestore fake-db suite) is green.

How the hard parts landed:

1. **Atomic dispatch via `SessionRepo.update`.** Action dispatch runs inside
   one read-modify-write: a Firestore transaction on Functions, a write
   transaction on SQLite, a direct apply on memory. The updater
   (`dispatchAction` in `sessionService.ts`) is pure — guards + core
   transition + action-log append only — so transaction retries are safe.
   Ghost snapshots, matchup records, rating updates, and run completions stay
   outside; exactly-once comes from the in-transaction terminal-phase guard
   plus the per-session-id idempotent repos.
2. **`clientActionId` is now honored.** The route passes it through;
   `handleAction` replays the stored wire response on a repeated key
   (session JSON + combat DTO — byte-identical to the first attempt) and
   stores it write-once after a fresh dispatch. The `idempotency` collection
   (doc id `playerId_sha256(key)`, since keys may contain `/`) backs it on
   Firestore; a new `idempotency` table backs it on SQLite.
3. **Combat-state storage** keeps the two-record shape (`sessions/{playerId}`
   + `combatStates/{playerId}`, batch-written; mirrors the SQLite split).
4. **Index-free queries**: every query filters a single field with `==`
   (covered by Firestore's automatic indexes) and sorts / windows / groups
   client-side — no composite indexes to deploy. (An early version filtered
   `completedAt >=` server-side and production correctly demanded a
   composite index; fixed 2026-09-05.)
5. **Token expiry** unchanged (middleware compares `expiresAt`); scheduled
   cleanup is still a later nice-to-have.

Known limits (accepted, not bugs): two truly simultaneous first-logins for
one provider account resolve via the lookup transaction (no forked players);
two simultaneous session *creates* last-write-wins (same as the VM — the
client never does this); an idempotency record is written just after the
transaction commits, so a crash in between re-runs one dispatch (repos stay
consistent; the client just retries).

## Environment / secrets mapping

Same `MANA_*` names; only the delivery changes:

| Variable | VM (today) | Functions |
|---|---|---|
| `MANA_STEAM_WEB_API_KEY` | root `.env` (secret) | Secret Manager: `firebase functions:secrets:set MANA_STEAM_WEB_API_KEY` (declared in `functions.ts`, deploys fail fast when missing) |
| `MANA_STEAM_APP_IDS`, `MANA_STEAM_API_URL` | `.env` / compose defaults | plain function env (`.env.<project>` in `server/`, or `--set-env-vars`) |
| `MANA_ITCH_ENABLED`, `MANA_GOOGLE_ENABLED`, `MANA_GOOGLE_CLIENT_ID` | `.env` | plain function env |
| `MANA_CORS_ORIGIN` | `*` / itch origins | plain function env — set the itch.io page origins for the web build |
| `MANA_TOKEN_TTL_DAYS`, rate-limit vars | `.env` | plain function env |
| `MANA_SQLITE_PATH` | `/data/mana.db` | ignored when Firestore is set (Functions have no durable disk) |
| `MANA_FIRESTORE_PROJECT_ID` | n/a | new — set to the Firebase project id to select the Firestore repos (the whole point); unset keeps SQLite/memory |
| `MANA_FUNCTIONS_REGION` | n/a | new — function region (default `us-central1`) |

Emulator secrets: `firebase functions:secrets:set` writes `.secret.local`
equivalents via `firebase functions:secrets:access` — or run the API with
plain `make server-mp` locally (the Express app is unchanged; the emulator
only matters for the Functions plumbing).

## Verification (done 2026-09-05, local emulators)

- **Firestore emulator** (port 8088) + the real Admin SDK: full run
  end-to-end — player/token setup, session create, 23 dispatches to a
  terminal phase, 404-after-finish, lobby profile, and an idempotent retry
  (ran once, replayed identically). All checks passed.
- **Functions emulator** (port 5001): the deployed `dist/functions.cjs`
  bundle loads as `api` and serves — `/health` → `{"ok":true}`, unauthenticated
  session calls → 401 `missing_token`. Proves the CJS packaging works.
- Two packaging bugs found this way and fixed: firebase-admin is v14 modular
  (`firebase-admin/app` + `firebase-admin/firestore`, no root `admin.firestore`),
  and `import.meta.url` does not survive esbuild's CJS transform (the loader
  uses `__filename` in CJS, `import.meta.url` from TS source). Also added
  `"main": "dist/functions.cjs"` to `server/package.json` (the emulator
  requires it) and `server/.secret.local` (emulator-only dummy for the
  declared Steam secret — `server/.env.*` / `server/.secret.*` are gitignored).

Emulator notes: needs a JDK on PATH (`JAVA_HOME` → Homebrew openjdk here);
the functions emulator runs host node (24) while production runs 22.

## Workflow

```bash
# one-time (needs a browser — not done for this machine yet)
firebase login
# console: create the Firestore database (Native mode, nam5), enable billing
# (Blaze) + the Cloud Functions API
firebase functions:secrets:set MANA_STEAM_WEB_API_KEY  # value: root .env

# dev loop (Functions plumbing)
cd server && npm run build
firebase emulators:start --only functions,firestore

# deploy
cd server && npm run deploy:functions -- --project <id>
curl https://us-central1-<project>.cloudfunctions.net/api/api/v1/sessions/current
# → 401 {"error":"missing_token",...} (proves routing + auth; /health → {"ok":true})
```

The doubled `/api/api` path is the emulator/production URL shape (function
name `api` + the app's `/api/v1` prefix) — `MANA_SERVER_URL` absorbs it
unchanged. Optional cleanup later: Firebase Hosting rewrite (`/api/**` →
the function) for a clean `https://<project>.web.app/api/v1/...`.

## Client switch (after F2)

Rebuild clients with the function URL — no code changes
(`phaser/src/RemoteServer.ts` reads the base URL at build time):

```bash
MANA_SERVER_URL=https://<region>-<project>.cloudfunctions.net/api npm run build
```

Covers the Steam Electron build, the itch.io web build (needs
`MANA_CORS_ORIGIN` set to the itch page origins), and the Android build.
Verify: Multiplayer login → full run → resume via `GET /sessions/current`.

## VM decommission checklist (last)

1. F2 deployed + production smoke test green (login, full run, resume,
   second account ghost matchmaking).
2. DNS: point `api.manabattle.com` at the function URL (or retire the name;
   clients bake the URL at build time, so old builds keep hitting the VM
   until rebuilt — keep the VM serving during the overlap).
3. Keep one SQLite snapshot (`server/scripts/backup.sh`) archived.
4. Then: `docker compose down` on the VM, delete `compose.yaml` +
   `server/scripts/{deploy,setup-docker,setup-bare,deploy-bare}.sh` +
   `server/{Dockerfile,Caddyfile*}` + `cloud-*` Makefile targets, and update
   `server/README.md` + `docs/game-server.md` §Config & deployment.
