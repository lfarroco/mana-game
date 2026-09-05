# AI Agent Guide — `server/`

Authoritative Node multiplayer game server for Mana Battle. Node 22, ESM,
express 5. Imports game logic via the `@game/*` alias → `../core/src/*`.
**Never imports `phaser/`.** API + endpoint summary: [README.md](README.md);
design: [docs/game-server.md](../docs/game-server.md), [docs/auth.md](../docs/auth.md).

## Layout

- `src/index.ts` — entry: config → app → listen, graceful shutdown (VM/bare-metal path)
- `src/functions.ts` — Firebase Functions entry (`api` 2nd-gen HTTPS trigger wrapping `createApp`); plan: [docs/firebase-backend.md](../docs/firebase-backend.md)
- `src/app.ts` — express app assembly (routes + middleware)
- `src/config.ts` — env parsing (`PORT`, `HOST`, `MANA_SQLITE_PATH`, `MANA_CORS_ORIGIN`, token TTL, Steam keys)
- `src/dto.ts` — wire DTOs + request validation (uses core `CombatCodec`)
- `src/errors.ts` — typed `ApiError`
- `src/http/routes/` — `sessions.ts`, `auth.ts`, `players.ts` (`GET /api/v1/players/me` — lobby profile)
- `src/http/middleware/` — auth (Bearer), cors, errors, logging, rateLimit
- `src/services/` — sessionService, authService, tokenService, steamAuth, itchAuth, matchmaking, rating, playerService (profile assembly)
- `src/persistence/` — `repositories.ts` (async repo interfaces), `memory.ts` (in-memory), `sqlite.ts` (better-sqlite3, durable), `firestore.ts` (Functions backend: Admin SDK, lazy-loaded); incl. `PlayerStatsRepo` (run completions → lobby victory stats) and `IdempotencyRepo` (`clientActionId` retry store)

## Conventions & gotchas

- Identity is bearer-token auth (`POST /api/v1/auth/steam` → `{ player, token }`).
  The retired `X-Player-Id` header is gone.
- Persistence sits behind repo interfaces — swap implementations without
  touching services. Unset `MANA_SQLITE_PATH` = in-memory; `:memory:` supported.
- Combat state is stored as a `CombatCodec` DTO in a separate `combat_states`
  table — live `SessionData` embeds Maps that plain JSON can't hold.
- Matchmaking ghosts: opponent snapshot per round via `GhostRepo`; rating
  applied exactly once per completed run (terminal-session 409 + per-session
  applied set).

## Verification

```bash
cd server
npm test            # 220 tests (unit + HTTP integration)
npm run typecheck
npm run build       # tsup → dist/
```

Single file: `npx jest src/path/File.test.ts --runInBand`.