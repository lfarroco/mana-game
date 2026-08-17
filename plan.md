# Mana Battle — Steam-Only Auth Implementation Plan (Phase 1.5)

**Last Updated**: 2026-08-13
**Status**: ✅ Implemented — all code tasks done (1–13); **task 14 (manual Steam smoke test) still pending** — requires a real `MANA_STEAM_WEB_API_KEY` + a Steam Electron build (see task 14 note).
**Phase**: `docs/game-server.md` → **1.5. Steam-only auth**
**Design**: [docs/auth.md](docs/auth.md) — data model, token scheme, flows, security
**Prerequisites**: Server Phase 1 (session API) done — in-memory `SessionRepo`, session routes on the dev-only `X-Player-Id` header.

## Overview

Implement Steam-only login for the multiplayer server:

1. The Electron client gets an auth ticket via `steamworks.js` (`auth.getAuthTicketForWebApi`).
2. The server validates it against Steam's `AuthenticateUserTicket` Web API (publisher key, hex ticket, `identity` binding), upserts a player, and issues an opaque bearer token (SHA-256 hashed server-side).
3. Bearer middleware replaces the `X-Player-Id` header on all session endpoints.

**No guest endpoints in this phase** — guest accounts are a future phase (Steam-only launch). No Firebase/Supabase Auth.

Key model (from auth.md): **Steam proves identity once; the server owns sessions.** Every API request is authorized by a server-issued bearer token.

Exit criteria (from auth.md / game-server.md): tests with a mocked Steam Web API; manual Steam auto-login against a local server; 401s on bad/expired tokens; `X-Player-Id` removed.

## Tasks

### Server — foundations

- [x] **1. Player & token repositories** — DONE (2026-08-13)
  - **Context**: v1 persistence is in-memory Maps behind repository interfaces; only `SessionRepo` exists today.
  - **Files**: `server/src/persistence/repositories.ts`, `server/src/persistence/memory.ts`
  - **Steps**:
    1. Define `Player` type (`playerId` uuid, `provider`, `providerId`, `displayName`, `createdAt`).
    2. Add `PlayerRepo`: `findByProvider(provider, providerId)`, `findById(playerId)`, `create(player)`.
    3. Define `TokenRecord` (`tokenHash` PK, `playerId`, `expiresAt`, `createdAt`).
    4. Add `TokenRepo`: `create(tokenHash, playerId, expiresAt)`, `findByHash(tokenHash)`.
    5. In-memory impls (fresh Maps per `createApp()`), same pattern as `createMemorySessionRepo`.
    6. Enforce the `UNIQUE(provider, provider_id)` upsert invariant in the memory impl (repeat login returns the same player).

- [x] **2. Token service** — DONE (2026-08-13)
  - **File**: `server/src/services/tokenService.ts`
  - **Steps**:
    1. `generateToken()` → `crypto.randomBytes(32).toString("base64url")`.
    2. `hashToken(token)` → SHA-256 hex (Node `crypto.createHash`).
    3. `issueToken(playerId, ttlDays)` → persist hash, return plaintext exactly once.
    4. TTL from config (`MANA_TOKEN_TTL_DAYS`, default 30).

- [x] **3. Auth service (provider abstraction)** — DONE (2026-08-13)
  - **File**: `server/src/services/authService.ts`
  - **Steps**:
    1. `findOrCreatePlayer({ provider, providerId, displayName? })` → upsert by `(provider, providerId)`; repeat logins reuse the existing player.
    2. Provider-agnostic `authenticate(credential)` contract so a future `POST /auth/<provider>` (Firebase/Supabase/guest) can slot in without touching sessions or matchmaking.
    3. `steam` is the only enabled provider this phase.

- [x] **4. Steam Web API client** — DONE (2026-08-13)
  - **File**: `server/src/services/steamAuth.ts`
  - **Steps**:
    1. `validateTicket({ ticket, identity, appId })` → `GET https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/` with `key` (server secret), `appid`, `ticket` (hex string), `identity`.
    2. Accept only HTTP 200 with a 17-digit `steamid` in `response.params`; anything else → invalid.
    3. Injectable `fetch` so tests can mock the Steam Web API.
    4. `identity` must match the client-side string; `appId` must be in `MANA_STEAM_APP_IDS`.

- [x] **5. `POST /api/v1/auth/steam` route** — DONE (2026-08-13)
  - **Files**: `server/src/http/routes/auth.ts` (new), `server/src/dto.ts`
  - **Steps**:
    1. `parseAuthSteamBody` DTO: `{ ticket: string (hex), identity: string, appId: number }`.
    2. Validate `identity` against the configured allowlist and `appId` against `MANA_STEAM_APP_IDS`.
    3. `validateTicket` → `findOrCreatePlayer` (displayName = Steam persona from the client) → `issueToken`.
    4. Respond `{ player, token }`; never log or echo the token.

- [x] **6. Config env vars** — DONE (2026-08-13)
  - **File**: `server/src/config.ts`
  - **Steps**:
    1. `steamWebApiKey` (`MANA_STEAM_WEB_API_KEY`), `steamAppIds` (comma-separated `MANA_STEAM_APP_IDS`, default alpha `3757600`), `tokenTtlDays` (`MANA_TOKEN_TTL_DAYS`, default 30).
    2. Config parsing tests for the new vars.

- [x] **7. Error codes** — DONE (2026-08-13)
  - **File**: `server/src/errors.ts`
  - **Steps**: Add `missing_token`, `invalid_token`, `invalid_steam_ticket`, `invalid_identity` to `ApiErrorCode`.

### Server — middleware & migration

- [x] **8. Bearer auth middleware** — DONE (2026-08-13)
  - **File**: `server/src/http/middleware/auth.ts` (new)
  - **Steps**:
    1. Parse `Authorization: Bearer <token>`; missing/malformed → 401 `missing_token`.
    2. `hashToken` → `TokenRepo.findByHash` → expiry check → attach `req.playerId`.
    3. Not found or expired → 401 `invalid_token`.

- [x] **9. Migrate session routes off `X-Player-Id`** — DONE (2026-08-13)
  - **Files**: `server/src/http/routes/sessions.ts`, `server/src/dto.ts`, `server/src/app.ts`
  - **Steps**:
    1. Remove `parsePlayerId` / `X-Player-Id` header usage; read `req.playerId` from the middleware instead.
    2. Extend `AppDeps` with `playerRepo` / `tokenRepo` (and an injectable Steam client for tests); wire `authRouter` + auth middleware in `createApp`.
    3. Update HTTP integration fixtures (`server/test/api.test.ts`) to obtain a token via `POST /auth/steam` (mocked Steam API) or a test-only token factory, then send `Authorization: Bearer <token>`.
    4. Keep `GET /health` and `POST /auth/steam` unauthenticated.

- [x] **10. Rate-limit auth endpoints** — DONE (2026-08-13)
  - **Files**: `server/package.json`, `server/src/app.ts`, `server/src/config.ts`, `server/src/http/middleware/rateLimit.ts`
  - **Steps**:
    1. Add `express-rate-limit` dependency (v8).
    2. Apply a per-IP limit to `POST /auth/steam` (ticket grinding); revisit `POST /players` when guest accounts land.
    3. Config: `MANA_AUTH_RATE_LIMIT_MAX` (default 20), `MANA_AUTH_RATE_LIMIT_WINDOW_MS` (default 15 min). 429s use the API's JSON `{ error: "rate_limited" }` shape.

### Client — Electron

- [x] **11. Electron preload ticket hook** — DONE (2026-08-13)
  - **File**: `phaser/electron/preload.cjs` (only `phaser/electron/main.cjs` if needed)
  - **Steps**:
    1. Expose `window.auth.getSteamAuthTicket(identity, timeoutMs?)` wrapping `steamworks.auth.getAuthTicketForWebApi` → returns the ticket as a hex string (`ticket.getBytes().toString("hex")`).
    2. Graceful failure when `steamworks` is unavailable (browser build) — returns `null` and logs; the renderer falls back to single-player.

- [x] **12. Client login flow** — DONE (2026-08-13)
  - **File**: `phaser/src/lib/steamAuth.ts` (new auth module; feeds the Phase 3 `RemoteServer` rewrite) + `phaser/src/lib/steamAuth.test.ts`
  - **Steps**:
    1. On multiplayer entry: require `window.steamworks`; request a ticket (shared `identity` constant with the server — `STEAM_IDENTITY = "mana-game-v1"`, duplicated in `server/src/services/steamAuth.ts` and `phaser/src/lib/steamAuth.ts`, keep in sync); `POST /api/v1/auth/steam`.
    2. Persist `{ token, player }` via the existing storage provider (`phaser/src/Systems/Storage/`) under `mana_auth_session`.
    3. `getBearerToken()` exposes the stored token for `Authorization: Bearer <token>` on all subsequent session requests.
    4. The full `RemoteServer.ts` HTTP rewrite stays in Phase 3 (`docs/game-server.md`) — this phase only lands the login flow.
    5. Server URL from `MANA_SERVER_URL` (webpack DefinePlugin, default `http://127.0.0.1:8787`); appId from `IS_DEMO` (alpha `3757600` / demo `4233280`).

### Testing & verification

- [x] **13. Unit + integration tests** — DONE (2026-08-13)
  - **Files**: `server/test/` (`auth.test.ts`, `authMiddleware.test.ts`, `authService.test.ts`, `steamAuth.test.ts`, `tokenService.test.ts`, `rateLimit.test.ts`, `config.test.ts`, `api.test.ts`, …) + `phaser/src/lib/steamAuth.test.ts`
  - **Steps**:
    1. `tokenService`: hash round-trip, TTL expiry.
    2. `steamAuth`: mocked `fetch` — valid ticket → steamid; non-200 / wrong identity / wrong appid → invalid.
    3. `authService`: upsert uniqueness (repeat login returns the same `playerId`).
    4. HTTP: `POST /auth/steam` happy path; 401s for missing/malformed/expired tokens on session routes; per-player isolation (two tokens → two players → independent sessions); 429 rate-limit tests.
    5. Client login module: 9 jest tests (request shape, persistence, failure paths).
    6. Keep the existing tests green — 109 server tests + client suite.

- [ ] **14. Manual Steam smoke test** — ⏳ PENDING (manual — requires a real Steam publisher key + Steam Electron build; cannot be automated in CI)
  - **Steps**:
    1. Run the server with `MANA_STEAM_WEB_API_KEY` and `MANA_STEAM_APP_IDS` set.
    2. Launch the Steam Electron build → auto-login succeeds → `GET /sessions/current` returns the player's run.
    3. Confirm requests without a valid token get 401s and `X-Player-Id` is no longer accepted.

## Definition of done

- [x] Bearer tokens replace `X-Player-Id` on all session endpoints; the `X-Player-Id` code paths are deleted.
- [ ] `POST /api/v1/auth/steam` authenticates a real Steam ticket end-to-end (Electron → server → Steam Web API) — blocked on task 14 (manual smoke test, needs real Steam key).
- [x] Tokens are stored SHA-256-hashed with expiry; 401s on missing/invalid/expired tokens.
- [x] Unit + HTTP integration suites green (mocked Steam Web API); existing tests still pass (109 server tests).
- [ ] Manual Steam auto-login smoke test passes (task 14).
- [x] `AGENTS.md` task **"Server auth — Steam-only (Phase 1.5)"** checked off; `docs/auth.md` updated with any deviations discovered during implementation.


