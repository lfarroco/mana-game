# Auth — Mana Game Server

**Status**: ✅ Implemented (2026-08-13) — Phase A (repos/middleware) and Phase B (Steam login) are landed; **manual Steam smoke test still pending** (needs a real publisher Web API key + Steam Electron build — see [plan.md task 14](plan.md)). Deviations found during implementation: [Implementation notes & deviations](#implementation-notes--deviations).
**Created**: 2026-08-13
**Scope**: `server/` (Node multiplayer backend) + the Electron/Steam client side in `phaser/`.
**Related**: [game-server.md](game-server.md) (backend plan), [code-quality-cleanup.md](code-quality-cleanup.md) (quarantined Supabase code).

## Purpose

Design the authentication for the multiplayer server. Requirements from the 2026-08-13 discussion:

- **Steam players auto-login** — zero friction in the Electron build.
- **Non-Steam players should be able to play too** (itch.io/browser build), but the launch is **Steam-only** — browser/guest support is a future phase.
- Keep the option open for Firebase/Supabase-style auth for non-Steam players later.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Steam = identity proof only; the server issues its own session tokens.** | Steam's `AuthenticateUserTicket` verifies "this is Steam user X" once, per login. It provides no "logged-in user" state for your HTTP API over the lifetime of a run — the server needs its own bearer tokens for every request. |
| 2 | **The game server DB is the system of record for all players** (Steam and non-Steam). | Ratings, ghosts, and active sessions are inherently per-player data that only make sense in your DB. Steam/Firebase merely prove identity; your `players` table is the source of truth. |
| 3 | **Steam-only launch.** `POST /api/v1/auth/steam` is the only auth endpoint; there are **no guest accounts** in the Steam-only launch — non-Steam support is a future phase. | Product decision (2026-08-13): Steam players are a priority, and guests aren't needed until non-Steam players ship. |
| 4 | **Use the Steam persona name as the display name.** | No separate naming step for Steam players; `localplayer.getName()` is available client-side (and `ISteamUser/GetPlayerSummaries` server-side if unverified names ever matter). |
| 5 | **When non-Steam players eventually ship, use server-issued guest tokens rather than Firebase/Supabase Auth.** | Guests in localStorage fully cover continuity for an autobattler; zero deps, zero JWT verification, zero signup-abuse surface. Add a provider later behind the same abstraction if email/social/cross-device identity is ever needed. |

## Core concept: Steam proves identity, your server owns sessions

The single most important model in this doc:

```
Steam (ticket exchange)     →  "this is Steam account 7656119..."
                              └── happens once, at login
Your server (bearer token)  →  "this is playerId <uuid>, allowed to touch their sessions"
                              └── every API request
```

Steam does **not** keep your HTTP server logged in. After the ticket is consumed by `AuthenticateUserTicket`, subsequent requests are authorized purely by your own tokens. This is standard for dedicated-server games, and it's why even the old Supabase edge function still had to mint a Supabase session after validating the Steam ticket.

## Research findings (verified 2026-08-13)

### Client side — steamworks.js (already in the project)

- `steamworks.js@^0.4.0` is a dependency of `phaser/` and is already initialized in the Electron shell:
  - `electron/main.cjs` — `require('steamworks.js')`, `steamworks.electronEnableSteamOverlay()` before `app.whenReady()`.
  - `electron/preload.cjs` — `window.steamworks = steamworks.init()`.
- Available auth API (from `phaser/node_modules/steamworks.js/client.d.ts`):
  - `client.auth.getAuthTicketForWebApi(identity: string, timeoutSeconds?): Promise<Ticket>` — the modern API for server-side validation.
  - `client.auth.getSessionTicketWithSteamId(steamId64, timeoutSeconds?)` / `getSessionTicketWithIp(ip, ...)` — legacy P2P-oriented ticket APIs; **not** what we want for web-api validation.
  - `client.localplayer.getSteamId(): { steamId64: bigint; steamId32: string; accountId: number }`.
  - `client.localplayer.getName(): string` — the Steam persona (display name).
- `Ticket.getBytes(): Buffer` returns the **raw binary** ticket; `Ticket.cancel()` invalidates it.

### Server side — Steam Web API `AuthenticateUserTicket`

From the Steamworks documentation (`/doc/webapi/ISteamUserAuth`):

- `GET https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/`
- Required params: `key` (publisher Web API key — server secret), `appid`, `ticket` (**hex string** of the binary ticket from `GetAuthTicketForWebApi`), `identity` (must match the string passed to `GetAuthTicketForWebApi`; ties the ticket to your server).
- Returns the user's **64-bit SteamID** when the ticket is valid.
- "This call requires a publisher API key… MUST be called from a secure server, and can never be used directly by clients."
- Also available via `https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/` using a Web API user auth key (rate-limited) — the old edge function used this domain.

Known app ids (from `steam/steam_config/app_build*.vdf`): alpha `3757600`, demo `4233280`.

### What NOT to port from the retired `auth-steam` edge function

`phaser/supabase/functions/auth-steam/index.ts` (deleted 2026-08-13) demonstrated the ticket-exchange shape but has flaws that must not carry over:

- **Supabase-specific hack**: deterministic password `S#<sha256("Steam:" + steamid + ":" + salt)>!` + fake email `steam_<steamid>@manabattle.com` to abuse Supabase Auth's email/password flow. Irrelevant with your own `players` table — you simply store the `steamid64` as a provider id.
- **No hex encoding**: it passed the ticket as-is; the modern flow requires hex-encoding the binary ticket.
- **No `identity` binding** — weaker ticket-to-server binding than Valve recommends.
- **No rate limiting** on the auth endpoint (account/ticket abuse).
- **No token TTL / refresh** for its issued sessions.

## Architecture

### Data model

New repositories (`server/src/persistence/repositories.ts`) — in-memory v1 (`memory.ts`), SQLite Phase 4 (`sqlite.ts`):

```
players(
  player_id      uuid          PK   -- server-generated (replaces client-side "player_###")
  provider       'steam'|'guest'    -- future: 'firebase', 'google', ...
  provider_id    text          -- steamid64 for steam; null for guests
  display_name   text
  created_at     timestamp
  UNIQUE(provider, provider_id)     -- a Steam account maps to exactly one player
)

player_tokens(
  token_hash     text          PK   -- sha256(token)  ← only the hash is stored
  player_id      uuid          FK   -- → players.player_id
  expires_at     timestamp
  created_at     timestamp
)
```

- `player_id` replaces the current `X-Player-Id` header identity (trivially spoofable — fine for local dev only).
- A player may have multiple valid tokens (one per device/launch); expiry is enforced by the auth middleware.

### Token scheme

- Format: `crypto.randomBytes(32).toString("base64url")` — opaque, high-entropy.
- **Only the SHA-256 hash is stored server-side**; the plaintext is returned exactly once at login/signup and persisted by the client (localStorage today; Steam Cloud if cross-device continuity is wanted later).
- TTL: `MANA_TOKEN_TTL_DAYS` (default 30). Steam re-issues a fresh token every launch (auto-login), so expiry is mostly hygiene; guests get long-lived tokens (future phase).

### Provider abstraction

Auth verification is provider-specific; everything after it is provider-agnostic:

```
authService.authenticate(credential)
  → { provider: 'steam'|'guest', providerId, displayName? }   // verifies external identity
playerService.findOrCreatePlayer({ provider, providerId, displayName? })
  → Player
tokenService.issue(playerId)
  → { token, tokenHash }
```

Adding Firebase/Supabase later = one new `POST /auth/<provider>` handler that verifies their JWT and returns `{ provider: 'firebase', providerId: <uid> }`. Sessions, matchmaking, and ratings never know which provider a player came from. The `provider` column also lets matchmaking filter pools (e.g. Steam-only matchmaking during the Steam-only launch). During the Steam-only launch, `steam` is the only enabled provider.

## Auth flows

### Steam auto-login (Electron)

**Client** (`phaser/`, Electron only):

1. Check `window.steamworks` is present (set by the preload). If not (browser build), fall back to single-player.
2. `const identity = "mana-game-v1"` — a fixed string identifying this server; keep it in sync with the server.
3. `const ticket = await window.steamworks.auth.getAuthTicketForWebApi(identity, 10)`.
4. `const ticketHex = ticket.getBytes().toString("hex")`.
5. `POST /api/v1/auth/steam` with `{ ticket: ticketHex, identity, appId }`.
6. Persist `token` + `player`; start sending `Authorization: Bearer <token>` on every subsequent request (Phase 3 `RemoteServer` rewrite consumes this).

**Server** (`server/src/services/steamAuth.ts`):

1. Validate body: `ticket` (hex string), `identity` (matches the configured allowlist), `appId` (must be in `MANA_STEAM_APP_IDS`).
2. Call `https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/?key=${MANA_STEAM_WEB_API_KEY}&appid=${appId}&ticket=${ticket}&identity=${identity}`.
3. Success = HTTP 200 with a valid `steamid` in `response.params`; anything else (non-200, missing/empty `steamid`, not a 17-digit steamid64) → 401 `invalid_steam_ticket`.
4. `findOrCreatePlayer({ provider: 'steam', providerId: steamid, displayName })` — display name from `localplayer.getName()` (sent in the request) or `ISteamUser/GetPlayerSummaries` (optional).
5. Issue a token, return `{ player, token }` (plaintext token only here).

Notes:
- The client-supplied persona is unverified; if display-name integrity ever matters, fetch it server-side via `ISteamUser/GetPlayerSummaries/v2` (needs the steamid + publisher key).
- Tickets are single-use and short-lived — validate immediately, never cache them.

### Guest accounts (future phase)

Not needed for the Steam-only launch — there are no guest endpoints in v1. When non-Steam players ship, revisit this design:

- `POST /api/v1/players` `{ displayName? }` → creates `players(provider='guest')`, issues a token, returns `{ playerId, displayName, token }`.
- No "login" endpoint: the token IS the credential. The client persists it in localStorage (or the itch.io equivalent) and sends it as the Bearer token thereafter.
- Optionally generate `Guest-1234` names when no display name is supplied.

### Non-Steam browser players (future)

If browser players ever need named, cross-device accounts: add a provider (Firebase Auth / Supabase Auth / Google) behind the abstraction — see above. Steam has no browser OAuth for web games, so browser players will always be guest-or-third-party-provider, never Steam.

## HTTP API

Updated from [game-server.md](game-server.md). Base path `/api/v1`.

| Method | Path | Body → Response | Notes |
|---|---|---|---|
| GET | `/health` | → `{ ok: true }` | liveness — unauthenticated |
| POST | `/auth/steam` | `{ ticket, identity, appId }` → `{ player, token }` | Steam auto-login (Electron). Steam-only: the only auth endpoint in the Steam-only launch |
| POST | `/players` | `{ displayName? }` → `{ player, token }` | guest accounts — **future phase** (not part of the Steam-only launch, see [Guest accounts](#guest-accounts-future-phase)) |
| POST | `/sessions` | `{ crystalId, queueType? }` → `SessionData` | (unchanged) authenticated |
| GET | `/sessions/current` | → `SessionData` (+ `combatState?` while `phase === "combat"`) | (unchanged) authenticated |
| POST | `/sessions/current/actions` | `{ action, clientActionId? }` → `{ session, combatState? }` | (unchanged) authenticated |
| DELETE | `/sessions/current` | → 204 | (unchanged) authenticated |

Unauthenticated: `GET /health`, `POST /auth/steam`. Everything else requires `Authorization: Bearer <token>`.

### Middleware (`server/src/http/middleware/auth.ts`)

Replaces the current `X-Player-Id` header parsing in `routes/sessions.ts`:

1. Parse `Authorization: Bearer <token>`; missing/malformed → 401 `missing_token`.
2. `tokenHash = sha256(token)`; look up `player_tokens` by hash.
3. Not found or `expires_at < now` → 401 `invalid_token`.
4. Attach `req.playerId` (from the row) for route handlers/services.

## Config & env

| Var | Default | Used for |
|---|---|---|
| `MANA_STEAM_WEB_API_KEY` | — | Publisher Web API key (server secret; never shipped to clients) |
| `MANA_STEAM_APP_IDS` | `3757600` | Comma-separated allowlist of app ids the server will accept (alpha + demo) |
| `MANA_TOKEN_TTL_DAYS` | `30` | Bearer-token lifetime |
| `MANA_AUTH_RATE_LIMIT_MAX` | `20` | Per-IP request cap per window for `POST /auth/steam` |
| `MANA_AUTH_RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Rate-limit window for `POST /auth/steam` |
| `MANA_SERVER_HOST` / `MANA_SERVER_PORT` | `127.0.0.1` / `8787` | (existing) |

Client side: the renderer reads `MANA_SERVER_URL` (webpack DefinePlugin, default
`http://127.0.0.1:8787`) as the game-server base URL (`phaser/src/lib/steamAuth.ts`).

## Security & abuse

- **Publisher key is server-side only**; it must never appear in `phaser/` or the Electron bundle.
- **Rate-limit `POST /auth/steam`** (per-IP via `express-rate-limit`, `MANA_AUTH_RATE_LIMIT_MAX` / `MANA_AUTH_RATE_LIMIT_WINDOW_MS`): prevents ticket grinding. Exceeding the cap returns 429 `{ error: "rate_limited" }`. (Applies to `POST /players` too, once guest accounts land.)
- **Ticket abuse**: validate immediately (single-use), require a valid `appId` + matching `identity`, reject non-17-digit `steamid`s.
- **Token hygiene**: store only SHA-256 hashes; enforce `expires_at` in the middleware.
- **No client-chosen player ids**: the client never tells the server who it is; the server derives identity from the token.
- Steam ban state: `AuthenticateUserTicket` responses include `vacbanned` / `publisherbanned` — decide later whether to block those players.

## Testing strategy

- **Unit**: `tokenService` (hash/expiry), `steamAuth` against a mocked Steam Web API fetch (valid ticket → steamid; non-200 → 401; wrong identity/appid → 401), `playerService` upsert uniqueness.
- **HTTP integration**: supertest — `POST /auth/steam` with a mocked Web API; 401s for missing/malformed/expired tokens on all session routes; per-player isolation (two tokens → two players → independent sessions).
- **Flow**: Electron manual smoke — Steam build launches, auto-login succeeds, `GET /sessions/current` returns the player's run.
- Env plumbing: config parsing tests for the new vars.

## Implementation phases

| Phase | Deliverable | Exit criteria | Status |
|---|---|---|---|
| **A. Player/token repos + bearer middleware** | `PlayerRepo`/`TokenRepo` (in-memory), `authService`/`tokenService`, Bearer middleware replacing `X-Player-Id` | unit + HTTP tests green; session routes run off tokens | ✅ done (2026-08-13) |
| **B. Steam login** | `POST /auth/steam` + `steamAuth` service (mocked Web API in tests), electron preload ticket hook, client login flow | manual Steam auto-login against a local server; 401s on bad tickets | ✅ code done (2026-08-13); manual smoke test pending (plan.md task 14) |
| **C. Client wiring** | folds into Phase 3 client integration (HTTP `RemoteServer` + token persistence) | MP run end-to-end from the Steam build | ✅ code done (2026-08-13) — `phaser/src/RemoteServer.ts` is the HTTP adapter (bearer auth via `getBearerToken()`); manual MP run from the Steam build still pending (plan.md task 14) |

The original plan was guest-first; the Steam-only launch flips it — Phases A and B are independent, and B is the priority.

## Implementation notes & deviations

Recorded 2026-08-13 while implementing plan.md tasks 1–13. Items marked *(deviation)* differ from the original design text; everything else confirms it.

- **Identity constant is duplicated, not shared.** `STEAM_IDENTITY = "mana-game-v1"` lives in `server/src/services/steamAuth.ts` **and** `phaser/src/lib/steamAuth.ts`. Putting it in `core/` was considered, but core is pure game logic (purity boundary) and the value is auth-specific. **Keep the two in sync** — the server rejects tickets whose `identity` doesn't match.
- **Rate limiting** landed as `server/src/http/middleware/rateLimit.ts` + `MANA_AUTH_RATE_LIMIT_MAX` / `MANA_AUTH_RATE_LIMIT_WINDOW_MS` config (default 20 req / 15 min). 429 responses use the API JSON shape `{ error: "rate_limited", message }` so clients can branch on the machine-readable code.
- **Preload hook returns a hex string.** `window.auth.getSteamAuthTicket(identity, timeoutMs?)` (electron/preload.cjs) wraps `steamworks.auth.getAuthTicketForWebApi` and returns `ticket.getBytes().toString("hex")` — the exact form `AuthenticateUserTicket` expects. It returns `null` (and logs) when `steamworks` is unavailable, so the renderer can fall back to single-player. `timeoutMs` is converted to steamworks' `timeoutSeconds`.
- **Client login module** is `phaser/src/lib/steamAuth.ts` (exported `steamAuth` singleton + injectable `createSteamAuthClient` factory for tests). It persists `{ token, player }` via the existing `@Systems/Storage` provider under the key `mana_auth_session`, and exposes `getBearerToken()` for the Phase 3 `RemoteServer` rewrite. The token is never logged or echoed. The module is **not yet wired into the multiplayer UI** — Phase 3 does that (task 12 step 3 only lands the login flow, per plan.md).
- **Client app id is derived from the build.** `STEAM_APP_ID` = `IS_DEMO ? 4233280 (demo) : 3757600 (alpha)` — both are in the server's default `MANA_STEAM_APP_IDS` allowlist.
- **`MANA_SERVER_URL`** was added to `phaser/webpack/config.base.cjs` DefinePlugin (empty by default → runtime fallback `http://127.0.0.1:8787`) so a build can point at a remote server.
- **Token TTL is not refreshed per request** — a token expires `MANA_TOKEN_TTL_DAYS` (30) after issue; Steam re-issues on every launch, which is the expected flow for an autobattler (docs/auth.md decisions). Token refresh is parked in Phase 5 extras.
- **`X-Player-Id` code paths are deleted**; only comments/READMEs describing what replaced it remain.
- **Manual smoke test** (plan.md task 14) is the only unfinished item — it needs a real publisher Web API key + the Steam Electron build, so it cannot be automated in CI.



