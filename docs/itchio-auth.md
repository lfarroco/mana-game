# itch.io Auth — Web Build Multiplayer Login

**Status**: ✅ **Implemented** (2026-08-20). Server `itch` provider + client OAuth-popup
login are landed and unit-tested. **2026-09-02: the web flow moved to the game server's
stable OAuth relay page (`https://api.manabattle.com/oauth/callback`) as the itch OAuth
callback** — this retires the per-deploy chore of re-registering the changing embed URL
(`https://html-classic.itch.zone/html/<game>/<upload>/index.html`) that the first live
smoke test surfaced ("invalid redirect URI", 2026-08-27). The relay is shared with the
Android flow (see [android-multiplayer.md](android-multiplayer.md)).
**Created**: 2026-08-20
**Scope**: `server/` (new `itch` auth provider + the OAuth relay page) + `phaser/`
(browser itch.io login flow).
**Related**: [auth.md](auth.md) (auth design + provider abstraction),
[game-server.md](game-server.md) (backend plan),
[android-multiplayer.md](android-multiplayer.md) (the shared relay + Google/Android).

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
| Login URL (web + Android) | `https://itch.io/user/oauth?client_id=f20213f3887151a962afac88d0145c57&scope=profile%3Ame&response_type=token&redirect_uri=https%3A%2F%2Fapi.manabattle.com%2Foauth%2Fcallback` |
| Registered redirect URIs | **One stable registration** — `https://api.manabattle.com/oauth/callback`, the game server's OAuth relay page (`GET /oauth/callback`; `server/src/http/oauthRelayPage.ts`). Both the web and Android flows redirect here — **it never changes on deploy**, so there is no per-upload re-registration (unlike the old `https://html-classic.itch.zone/html/<game>/<upload>/index.html` callback, which changed with every push). Keeping `https://lfarroco.itch.io/mana-battle` registered is harmless but unused. Register in the OAuth app settings: `https://itch.io/settings/oauth`. |
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
itchio (web):    OAuth popup → relay page → postMessage → POST /auth/itch
                 ↑ the relay (api.manabattle.com/oauth/callback) forwards the
                   #access_token hash to the game; validates via api.itch.io/profile
itchio (Android): system browser → relay page → com.manabattle.app:// deep link
                 → POST /auth/itch   (see android-multiplayer.md)
```

The same relay serves the **Google web popup flow** (`POST /auth/google` — the
relay's postMessage is provider-agnostic: `access_token` for itch, `id_token`
for Google) — see [android-multiplayer.md](android-multiplayer.md).

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
    `window.open(authUrl)` synchronously with a `crypto.randomUUID()` `state` nonce; the
    popup redirects to the game server's **relay page** (`<server>/oauth/callback`), which
    posts the hash back over cross-origin `postMessage` (the listener verifies
    `event.origin` = the server's origin + the `state` nonce); if `window.open` returns
    `null` (popup blocked) fall back to a top-level redirect whose state carries the game
    URL so the relay can send the browser back to the game with the hash (the boot
    capture handles the return).
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
   `MANA_SERVER_URL` also derives the OAuth callback (`https://api.manabattle.com/oauth/callback`),
   which must be registered in the OAuth app (`https://itch.io/settings/oauth`).
4. **D3 smoke test** on the live itch.io embed: click Multiplayer → OAuth popup →
   authorize → the popup lands on the **relay page** (`api.manabattle.com/oauth/callback`)
   → login → multiplayer lobby (profile + stats) → NEW GAME → crystal
   selection → MP run against the deployed server. Verify: garbage token → 401
   modal; second click reuses the stored session (no popup); token never appears
   in the URL after login; **a fresh deploy does not break login** (the callback no
   longer depends on the upload id); Electron build still uses Steam.

### ✅ D3 live-test finding (2026-08-27) — resolved 2026-09-02 by the stable relay

The first live smoke test (after the env-guard fix, release-audit item 7) opened the
OAuth popup but itch.io rejected it with **"invalid redirect URI"**: the popup URL
carried `redirect_uri=https://html-classic.itch.zone/html/<game>/<upload>/index.html` —
the game runs inside an iframe on the embed, so `window.location` was the **direct game
URL**, whose upload id changes with every deploy.

**Fixed 2026-09-02 (code + one-time registration):** the client no longer builds the
redirect URI from `window.location`; the callback is now the game server's stable relay
page (`https://api.manabattle.com/oauth/callback`, derived from `MANA_SERVER_URL`).
Register that single URL in the OAuth app settings and **no re-registration is ever
needed on deploy**.


## Testing & verification (per package)

```
server:  npm test && npm run typecheck && npm run build
phaser:  npm run test:unit && npm run typecheck && npm run lint
```

(From inside `server/` / `phaser/`. Single file: `npx jest src/path/ToFile.test.ts --runInBand`.)

## Risks & open questions

- **Redirect-URI strictness** — `redirect_uri` must match a registered value exactly; the
  client now always uses the game server's **stable relay page**
  (`MANA_SERVER_URL` + `/oauth/callback`, e.g. `https://api.manabattle.com/oauth/callback`)
  — it never changes on deploy, so no per-upload re-registration. Register it once in the
  OAuth app settings; page variants (trailing slash, `?secret=` links) must not change it.
  (The old callback — the direct iframe URL `https://html-classic.itch.zone/html/<game>/<upload>/index.html`
  — changed with every push and required a manual update each deploy; that pain is gone.)
- **Iframe sandbox** — if the itch.io embed blocks popups, the top-level-redirect fallback
  covers it: the fallback's OAuth state carries the game URL, the relay bounces the
  browser back there with the hash, and the boot capture stashes the returned token.
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
