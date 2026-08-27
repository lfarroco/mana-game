# itch.io Auth — Web Build Multiplayer Login

**Status**: ✅ **Implemented** (2026-08-20). Server `itch` provider + client OAuth-popup
login are landed and unit-tested. The **first live smoke test (D3) hit a configuration
gap that is now documented here — itch.io rejected the OAuth redirect with "invalid
redirect URI"** because the live embed runs the game inside an iframe at the direct game
URL (`https://html-classic.itch.zone/...`), so the runtime redirect URI is the embed URL,
not the registered game-page URL. **Action: add the embed URL to the OAuth app's
redirect URIs (`https://itch.io/settings/oauth`), then re-run the D3 smoke test.**
See the [D3 verification checklist](#d3-verification-checklist) below.
**Created**: 2026-08-20
**Scope**: `server/` (new `itch` auth provider) + `phaser/` (browser itch.io login flow).
**Related**: [auth.md](auth.md) (auth design + provider abstraction),
[game-server.md](game-server.md) (backend plan).

## Purpose

Multiplayer currently requires a **Steam** login (Electron build only — `docs/auth.md`).
The itch.io web build (`https://lfarroco.itch.io/mana-battle`) needs its own login so
browser players can play online. itch.io's OAuth **implicit flow** plus the server's
existing identity-provider abstraction make this a single new provider (`itch`) on both
sides — exactly the extension point `docs/auth.md` reserved ("a future provider is a
single new `Authenticator` + route").

## itch.io auth facts (verified 2026-08-20 from the official docs)

| Fact | Detail |
|---|---|
| OAuth flow | **Implicit flow** — no server secret, no code exchange. Redirect to `https://itch.io/user/oauth?client_id=…&scope=…&redirect_uri=…&response_type=token&state=…` |
| Token delivery | The access token (a long-lived API key) is returned in the **URL hash** of the redirect URI: `…#access_token=…&state=…` |
| Server-side validation | `GET https://api.itch.io/profile` with `Authorization: Bearer <token>` → `{ "user": { "id": 1994, "username": "…" } }`. The API accepts both JWTs and API keys here automatically — **one endpoint validates both** the itch-app-injected JWT and the OAuth key |
| Minimal identity scope | `profile:me` |
| Callback page | Can be the game page itself: at boot, read `#access_token` from the URL hash and POST it to your server (itch.io's documented pattern) |
| itch app env var | Desktop games receive `ITCHIO_API_KEY` (a JWT) as an env var. Web games in the app may get it injected in the URL — detection is opportunistic (Phase B) |

## Registered app — one-time setup ✅ DONE (2026-08-20)

| Item | Value |
|---|---|
| OAuth app name | `Mana Battle Multiplayer` |
| Client ID (public — ships in the web bundle) | `f20213f3887151a962afac88d0145c57` |
| Login URL (live embed) | `https://itch.io/user/oauth?client_id=f20213f3887151a962afac88d0145c57&scope=profile%3Ame&response_type=token&redirect_uri=https%3A%2F%2Fhtml-classic.itch.zone%2Fhtml%2F18978979-1920401%2Findex.html` |
| Registered redirect URIs | **Both must be registered** in the OAuth app (itch.io user settings → OAuth apps → `Mana Battle Multiplayer`, `https://itch.io/settings/oauth`): <br> 1. **`https://html-classic.itch.zone/html/18978979-1920401/index.html` — the live one.** On the itch.io embed the game runs inside an iframe at the direct game URL, so `window.location.origin + window.location.pathname` (what `readRedirectUri()` in `phaser/src/lib/itchAuth.ts` builds) is exactly this URL. **Missing this caused "invalid redirect URI" in the first live smoke test.** <br> 2. `https://lfarroco.itch.io/mana-battle` — only produced if the game ever ran top-level at the game-page URL (not the case today); harmless to keep. |
| Scope requested | `profile:me` |
| Developer API key | **Deliberately not stored in this doc — it is a credential.** Saved to the gitignored root `.env` as `MANA_ITCH_API_KEY`. Treat like a password. |

The itch.io implicit flow needs **no client secret** — only the public client ID.

### Developer API key (`MANA_ITCH_API_KEY`) — not consumed by this feature

Created per itch.io docs for programmatic game queries. It is the developer's account
key (full account access). The auth flow does **not** need it: the server validates the
*player's* token against `api.itch.io/profile` using the player's own token. The
developer key would only be needed later for account-level checks (e.g.
`game:view:purchases` ownership gating, `wharf/latest` update checks).

## Architecture mapping

The auth service (`server/src/services/authService.ts`) is already provider-agnostic:
`login(provider, credential)` → provider `Authenticator.authenticate(credential)` →
`findOrCreatePlayer` upsert by `(provider, providerId)` → opaque bearer token. The repos
accept new provider strings with **no migration** (SQLite `provider TEXT` +
`UNIQUE(provider, provider_id)`; in-memory map key `provider:providerId`).

The client mirrors `phaser/src/lib/steamAuth.ts`: obtain the itch.io credential → POST it
to the server → persist the issued `{ token, player }` via the storage provider → every
`RemoteServer` request carries `Authorization: Bearer <token>`.

```
Steam/Electron:  getAuthTicketForWebApi → POST /auth/steam      → server bearer token
itchio (web):    OAuth popup → #access_token → POST /auth/itch  → server bearer token
                                                 ↑ validates via api.itch.io/profile
```

## Config summary

| Env var | Where | Meaning |
|---|---|---|
| `MANA_ITCH_CLIENT_ID` | `phaser/` web build (webpack DefinePlugin, `config.base.cjs`) | Public OAuth client id; empty → browser multiplayer shows "itch auth not configured" |
| `MANA_ITCH_ENABLED` | `server/` | `true` registers `POST /api/v1/auth/itch` (default `false`, mirrors the Steam gate) |
| `MANA_CORS_ORIGIN` | `server/` | Allow **both** itch.io origins in production: `https://html-classic.itch.zone` (the game iframe's origin — what the embedded game actually sends as `Origin` on every API call) and `https://lfarroco.itch.io`. Comma-separated (`*` also works: bearer-token auth, no cookies) |
| `MANA_ITCH_API_KEY` | root `.env` (gitignored) | Developer account key — **not consumed** by this feature; future ownership checks |

## Phase A — Server: `itch` provider

- [x] **A1. Provider type** — `server/src/persistence/repositories.ts`: `PlayerProvider`
  → `"steam" | "itch" | "guest"`. Update the doc comment (no longer "Steam is the only
  enabled provider").
- [x] **A2. itch auth client** — new `server/src/services/itchAuth.ts` (mirror
  `steamAuth.ts`):
  - `ITCH_PROFILE_URL = "https://api.itch.io/profile"`.
  - `createItchAuthClient({ url?, fetch? })` → `{ validateToken(token), authenticator }`
    (`authenticator.provider = "itch"`).
  - `validateToken`: `GET ${url}` with `Authorization: Bearer <token>`. Map errors like
    Steam: network failure → 502 `internal_error`; non-2xx → 401 `invalid_itch_token`
    (log the upstream body server-side, never the token); non-JSON / missing or
    non-numeric `user.id` → 401.
  - `authenticate(credential)` validates `{ token: string }` (non-empty), then returns
    `ProviderIdentity { providerId: String(user.id), displayName: user.username }` —
    display name is **server-verified** (stronger than Steam's client-supplied persona).
- [x] **A3. DTO** — `server/src/dto.ts`: `parseAuthItchBody(body)` → `{ token: string }`
  (non-empty, length-capped). Mirror `parseAuthSteamBody`'s wire-boundary-only style.
- [x] **A4. Route** — `server/src/http/routes/auth.ts`: register `POST /auth/itch` when
  itch is enabled; keep `POST /auth/steam` gated on the Steam key; feed **both**
  `Authenticator`s into one `createAuthService`. Generalize authService's
  "steam-only this phase" error message (`server/src/services/authService.ts`).
- [x] **A5. Wiring** — `server/src/config.ts` (`MANA_ITCH_ENABLED`, default `false`),
  `server/src/app.ts` (mount `/api/v1/auth` when Steam **or** itch is configured; new
  `itch?: boolean` dep), `server/src/index.ts` (pass through).
- [x] **A6. Server tests** — `server/test/itchAuth.test.ts` (profile success incl.
  username, non-2xx → 401, network failure → 502, non-JSON, bad shape, empty token);
  extend `server/test/auth.test.ts` (`/auth/itch` happy path returns `{ player, token }`
  with `provider: "itch"`, bad token 401, route absent when disabled, rate limit);
  extend `server/test/dto.test.ts` + `server/test/config.test.ts`.

## Phase B — Client: itch login module + OAuth capture

- [x] **B1. Shared auth session store** — new `phaser/src/lib/authSession.ts` extracted
  from `steamAuth.ts`: `AUTH_STORAGE_KEY` (`mana_auth_session`), provider-aware
  `AuthSession` / `AuthPlayer` (`provider: "steam" | "itch"`), `parseSessionPayload`
  (currently hard-codes `"steam"` — must preserve the provider from the server response),
  `readStoredSession` / `saveSession` / `clearSession` / `getBearerToken`,
  `readServerUrl()`. Refactor `phaser/src/lib/steamAuth.ts` to delegate; its tests keep
  passing. `phaser/src/RemoteServer.ts` default token provider switches to the shared
  `getBearerToken`; generalize its "requires Steam login" message.
- [x] **B2. itch auth client** — new `phaser/src/lib/itchAuth.ts` (mirror `steamAuth.ts`,
  injectable factory for tests):
  - `ITCH_CLIENT_ID` from the build-time define (`process.env.MANA_ITCH_CLIENT_ID`),
    `ITCH_SCOPE = "profile:me"`, auth URL `https://itch.io/user/oauth`.
  - Token acquisition priority: (1) URL query param (itch-app webview injection, JWT);
    (2) stashed hash token from a top-level redirect return; (3) **OAuth popup** —
    `window.open(authUrl)` synchronously with a `crypto.randomUUID()` `state` nonce, then
    await a same-origin `postMessage` from the popup, verify `event.origin` + `state`;
    if `window.open` returns `null` (popup blocked) fall back to a top-level redirect
    (the boot capture handles the return).
  - `loginWithItch()`: reuse the stored server session if present (itch OAuth keys are
    long-lived — no popup on repeat visits); else acquire a token → `POST /api/v1/auth/itch`
    → persist → return. Never log the token.
- [x] **B3. Boot-time OAuth capture** — `phaser/src/main.ts`: call
  `handleOAuthCallbackIfPresent()` before the game boots. If `location.hash` has
  `access_token`: with `window.opener` → `postMessage({ type, token, state }, origin)` to
  the opener and `window.close()` **without booting the game** (return early); without
  opener (top-level return) → stash `{ token, state }` for the next `loginWithItch()` and
  clear the hash via `history.replaceState`.
- [x] **B4. Build config** — `phaser/webpack/config.base.cjs`: add
  `"process.env.MANA_ITCH_CLIENT_ID"` to `createSharedDefineValues` (same pattern as
  `MANA_SERVER_URL`).
- [x] **B5. Client tests** — new `phaser/src/lib/itchAuth.test.ts` (query-param token,
  hash capture stash, popup `postMessage` flow with state verification, popup-blocked
  fallback, login POST + persistence, corrupt session → logged out, `getBearerToken`);
  update `phaser/src/lib/steamAuth.test.ts` + `phaser/src/RemoteServer.test.ts` for the
  shared token provider.

## Phase C — UI wiring + i18n

- [x] **C1. Multiplayer button dispatch** — `phaser/src/Screens/Title/Components/arenaButton.ts`:
  `isElectron()` (`@Utils/environment`) → existing Steam flow; browser → `itchAuth` flow.
  Keep the re-entry guard and error-modal plumbing; after login navigate to the
  multiplayer lobby, which owns the RESUME / NEW GAME decision
  (docs/multiplayer-lobby.md). Call `loginWithItch()` as the first statement of
  the handler so the popup opens synchronously (popup-blocker requirement).
- [x] **C2. i18n** — add `title.multiplayer.requiresItch` ("Authorize Mana Battle with
  itch.io…") to all six catalogs (`en`, `es`, `jp`, `pt`, `cn`, `ru`); `requiresSteam`
  becomes Electron-only; reuse `loginFailed`.

## Phase D — Deployment, docs, manual verification

- [x] **D1. Deploy config** — web build env `MANA_ITCH_CLIENT_ID=f20213f3887151a962afac88d0145c57`;
  server env `MANA_ITCH_ENABLED=true`, `MANA_CORS_ORIGIN=https://html-classic.itch.zone,https://lfarroco.itch.io`
  (the embedded game fetches from the iframe origin `https://html-classic.itch.zone`, NOT the game page).
  Update `docs/building-and-running.md` + `server/README.md` env tables.
- [x] **D2. Docs** — update `docs/auth.md` (new provider section, retire "Steam-only
  launch" wording), `docs/game-server.md` endpoint table, this doc's status line, and
  remove the AGENTS.md Task Queue entry once landed.
- [ ] **D3. Manual smoke test** — on the live itch.io embed: click Multiplayer → OAuth
  popup → authorize → login → multiplayer lobby (profile + stats) → NEW GAME →
  crystal selection → MP run against the deployed server.
  Verify: garbage token → 401 modal; second click reuses the stored session (no popup);
  token never appears in the URL after login; Electron build still uses Steam.

## D3 verification checklist

**Status 2026-08-25: server-side ✅ verified — only the in-browser smoke test remains.**

### ✅ Verified (2026-08-25, against the live VM `.env` + live API)

1. **Server env** (the VM `.env` at `/opt/mana-game/.env`):
   - `MANA_ITCH_ENABLED= true` → parses **true** (`parseEnabled` trims in
     `server/src/config.ts`); `POST /api/v1/auth/itch` **is registered**.
   - `MANA_CORS_ORIGIN=*` → acceptable (bearer-token auth, no cookies).
   - `MANA_STEAM_API_URL` points at the public
     `https://api.steampowered.com/...` endpoint (correct for a standard Web API key).
   - `MANA_STEAM_APP_IDS` is **not set** in the VM `.env`, but the docker-compose
     deployment defaults it to `3757600,4233280` (`compose.yaml`), so both the
     alpha and the demo app are allowed.
2. **Live API checks (run 2026-08-25):**
   ```sh
   curl https://api.manabattle.com/health
   # {"ok":true}  (200)
   curl -X POST https://api.manabattle.com/api/v1/auth/itch -H 'Content-Type: application/json' -d '{}'
   # 400 {"error":"invalid_itch_token",...} — route IS registered (404 would mean disabled)
   ```

### ⚠️ Recommended VM `.env` hygiene (small)

- `MANA_ITCH_ENABLED= true` has a **leading space** — it works today (compose + the
  server both trim), but if anything ever stops trimming, itch silently disables.
  Fix: `MANA_ITCH_ENABLED=true`.
- Set `MANA_STEAM_APP_IDS=3757600,4233280` explicitly — the docker-compose default
  currently covers it, but the bare-systemd flow (`config.ts` default is only
  `[3757600]`) would reject demo players without it.

### ⏳ Remaining (human, in-browser)

3. **Client build:** the itch web build must be made with
   `MANA_SERVER_URL=https://api.manabattle.com` and `MANA_ITCH_CLIENT_ID=f20213f3887151a962afac88d0145c57`
   baked in (webpack `DefinePlugin`; the production build warns if either is missing).
4. **D3 smoke test** on the live itch.io embed: click Multiplayer → OAuth popup →
   authorize → login → multiplayer lobby (profile + stats) → NEW GAME → crystal
   selection → MP run against the deployed server. Verify: garbage token → 401
   modal; second click reuses the stored session (no popup); token never appears
   in the URL after login; Electron build still uses Steam.

### 🔴 D3 live-test finding (2026-08-27) — "invalid redirect URI" (fix is a registration)

The first live smoke test (after the env-guard fix, release-audit item 7) opened the
OAuth popup but itch.io rejected it with **"invalid redirect URI"**. The popup URL
carried `redirect_uri=https://html-classic.itch.zone/html/18978979-1920401/index.html` —
the game runs inside an iframe on the embed, so `window.location` (and therefore
`readRedirectUri()`) is the **direct game URL**, not the itch.io game-page URL that was
registered in the OAuth app.

**Fix (no code change):** in the OAuth app settings (`https://itch.io/settings/oauth` →
`Mana Battle Multiplayer`) add
`https://html-classic.itch.zone/html/18978979-1920401/index.html` to the registered
redirect URIs. The client already builds exactly this value. Keep the game-page URL
registered too. Then re-run the D3 smoke test.


## Testing & verification (per package)

```
server:  npm test && npm run typecheck && npm run build
phaser:  npm run test:unit && npm run typecheck && npm run lint
```

(From inside `server/` / `phaser/`. Single file: `npx jest src/path/ToFile.test.ts --runInBand`.)

## Risks & open questions

- **Redirect-URI strictness** — `redirect_uri` must match a registered value exactly; the
  client builds it from `window.location.origin + window.location.pathname` (page
  variants — trailing slash, `?secret=` links — must not change it). **Iframe gotcha
  (hit live 2026-08-27):** on the itch.io embed the game runs inside an iframe at the
  direct game URL (`https://html-classic.itch.zone/html/<game>/<upload>/index.html`), so
  that URL — not the game-page URL — is what must be registered. If the upload is ever
  deleted + recreated the upload id changes and the registration must be updated.
- **Iframe sandbox** — if the itch.io embed blocks popups, the top-level-redirect fallback
  covers it (boot capture stashes the returned token).
- **Identity ≠ ownership** — `profile:me` verifies *who* the player is, not game purchase.
  Ownership gating (if ever wanted) needs `game:view:purchases` later.
- **itch-app HTML5 injection** — the query-param detection is opportunistic; confirm the
  exact param name against the itch app docs during Phase D.
- **Shared storage key** — Steam and itch sessions share `mana_auth_session`
  (per-provider players are distinct records anyway). One session per device, overwritten
  on platform switch — matches the autobattler model.

## Resume guide

Interrupted mid-implementation? Do this:

1. Read `AGENTS.md` (project entry), then this doc.
2. Check the checkboxes above — they mark exactly what is done/undone.
3. Unchecked tasks run in order A → B → C → D; each phase is independently verifiable
   with the commands in [Testing & verification](#testing--verification-per-package).
4. Credentials you need: client ID (public, in the table above), redirect URI (table
   above), developer key (root `.env` → `MANA_ITCH_API_KEY`).
5. Cross-reference the existing Steam implementation as the template everywhere:
   `server/src/services/steamAuth.ts` ↔ new `itchAuth.ts`; `phaser/src/lib/steamAuth.ts`
   ↔ new `phaser/src/lib/itchAuth.ts`.
6. When landed: update the status line, tick all boxes, remove the AGENTS.md Task Queue
   entry, and update `docs/auth.md`.
