# Supabase Backend

This document describes the Supabase Edge Function backend used by Mana Battle for multiplayer actions and Steam-based authentication.

## Scope

The Supabase backend currently consists of two Edge Functions in `phaser/supabase/functions/`:

- `action`: server-authoritative multiplayer action/state endpoint
- `auth-steam`: Steam ticket validation and Supabase session issuance

Shared CORS policy is defined in `phaser/supabase/functions/_shared/cors.ts`.

## Function Architecture

### `action` function

File: `phaser/supabase/functions/action/index.ts`

Responsibilities:

- Handles authenticated gameplay actions from the client.
- Initializes a Supabase client with request `Authorization` header and validates user identity with `auth.getUser()`.
- Creates or updates `player_sessions` records.
- Applies team updates via `MultiplayerLogic.validateAndApplyTeamUpdate`.
- Resolves progression through `MultiplayerLogic.transitionToNextState`.
- On `combat_encounter`, attempts rating-based opponent team selection from nearby player sessions, then falls back to PvE generation when no suitable team is available.
- Persists resulting state (phase, round, step, options, team, action log, rating side-effects).

High-level request flow:

1. Preflight (`OPTIONS`) returns CORS headers.
2. Validate auth token and derive `playerId`.
3. Parse `{ actionId, payload }`.
4. If `start_session`:
   - Build initial session with `MultiplayerLogic.createInitialSession(...)`.
   - Upsert into `player_sessions` on `player_id` conflict.
   - Return created session.
5. Otherwise:
   - Load current `player_sessions` row.
   - If `update_team`, validate and persist team only (non-progression path).
   - If `combat_encounter`, query `players` within rating window and try to select a valid enemy team from candidate `player_sessions`.
   - Else transition state through `transitionToNextState`, persist changes, and return phase transition payload.
   - If matchmaking yields no valid team, transition uses the default PvE enemy team generation path.
6. If combat rating side-effect exists, invoke `increment_rating` RPC.

### `auth-steam` function

File: `phaser/supabase/functions/auth-steam/index.ts`

Responsibilities:

- Validates Steam auth tickets against Steam Web API (`AuthenticateUserTicket`).
- Derives a deterministic Supabase password from Steam ID + server-side salt.
- Signs users in (or registers/creates users if first login path requires it).
- Returns a Supabase session token payload for client use.

High-level request flow:

1. Preflight (`OPTIONS`) returns CORS headers.
2. Parse `{ ticket, appId }`.
3. Validate ticket with Steam API using `STEAM_WEB_API_KEY`.
4. On successful Steam validation, derive:
   - email: `steam_<steamId>@manabattle.com`
   - deterministic password via SHA-256
5. Attempt `signInWithPassword`.
6. If needed, fallback to `signUp`, then `auth.admin.createUser`, then retry sign-in.
7. Return authenticated Supabase session.

## Shared Game Logic Bundling

`action` imports `MultiplayerLogic` from a generated bundled file:

- Source of truth: `phaser/src/Multiplayer/MultiplayerLogic.ts`
- Generated bundle target: `phaser/supabase/functions/action/_shared.js`
- Build script: `phaser/scripts/bundle-edge.ts`

The bundle script uses `esbuild` to produce Deno-compatible ESM and aliases Phaser imports to `src/MockPhaser.ts` for runtime compatibility in Edge Functions.

## Environment Variables

### `action`

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET` (optional but recommended for local JWT verification path; falls back to `auth.getUser()` when unset)
- `MATCHMAKING_RATING_DELTA` (optional, default `150`): max absolute rating difference used when selecting multiplayer combat opponents

### `auth-steam`

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STEAM_WEB_API_KEY`
- `STEAM_APP_ID` (optional, defaults to `3350220` unless request overrides via `appId`)

Reference example env file: `phaser/.env.example`.

## Testing Strategy

Tests live in `phaser/supabase/functions/`:

- `action/index.test.js`: action function unit-style logic tests
- `auth-steam/index.test.js`: Steam auth and deterministic password tests
- `integration.test.js`: cross-function integration flow simulations

Run tests:

```bash
cd phaser
npm run test:supabase
```

Current test model is mock-heavy and validates contract/logic paths without hitting a live Supabase project.

## Deployment Process

From `phaser/package.json`:

1. `npm run bundle:edge`
2. `supabase functions deploy action`
3. `supabase functions deploy auth-steam`

Combined command:

```bash
cd phaser
npm run deploy:functions
```

## Operational Notes

- Keep Supabase initialization and auth checks lazy in frontend single-player paths to avoid unintended auth refresh traffic.
- Treat `action/_shared.js` and `auth-steam/_shared.js` as generated artifacts.
- CORS currently allows `http://localhost:8080`; adjust `cors.ts` for production host requirements.
