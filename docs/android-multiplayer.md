# Android Multiplayer — Google Sign-In & Login Hub

**Status**: ✅ **Implemented (2026-09-02)** — server `google` provider, the
multiplayer **login screen** hub, the Android OAuth relay + custom-scheme
deep-link transport, logout + 401 re-auth, and build/deploy env plumbing are
landed and unit-tested. The **live smoke test (D2) is pending** — it needs the
human-side registrations listed in [One-time setup](#one-time-setup--human-steps).
**Created**: 2026-09-02
**Scope**: `server/` (new `google` provider + OAuth relay page) + `phaser/`
(login screen, Google login lib, Android OAuth transport) + `android/`
(deep-link intent filter) + build/deploy env.
**Related**: [auth.md](auth.md) (auth design + provider abstraction),
[itchio-auth.md](itchio-auth.md) (itch.io web-build login),
[game-server.md](game-server.md) (backend plan),
[multiplayer-lobby.md](multiplayer-lobby.md) (the lobby hub).

## Purpose

The game has multiplayer on **Steam** (Electron auto-login) and **itch.io**
(web-build OAuth). This feature adds the **Android build** (Capacitor) to the
multiplayer family, with **Google sign-in** as the identity (Android system
browser + web popup) — plus a small **multiplayer login screen** so every
non-Steam platform can choose a provider, log out, and re-authenticate.

Player flow (per platform):

```
Steam (Electron): [Multiplayer] ──────────────────────→ [Multiplayer lobby]
                                                        (Steam auto-login, no login screen)

Web / Android:    [Multiplayer] → [Login screen:       → [Multiplayer lobby]
                                   Google · itch.io ·   (after a successful login)
                                   Log out · Back]
```

## Key facts (verified 2026-09-02)

- **Google in a WebView vs web**: Google blocks OAuth sign-in inside embedded
  WebViews (`disallowed_useragent`), so **Android** uses the redirect flow
  through the **system browser** — the app opens `accounts.google.com` in a
  Chrome Custom Tab, the player picks their (usually already-logged-in) Google
  account, and Google redirects to the registered redirect URI with the ID
  token in the **URL hash** (`#id_token=…&state=…`). Plain browser **popups**
  (the web/itch.io flow) are fine — Google only blocks the JS library's
  in-iframe flows and WebViews, neither of which this flow uses.
- **The URL-hash gotcha**: hash fragments are dropped when a browser→app
  https deep link is converted to an Android intent. The standard fix — used
  here — is a **relay page** the developer controls: Google/itch redirect the
  *system browser* to `https://api.manabattle.com/oauth/callback`, whose
  script does `location.replace("com.manabattle.app://oauth#…")` — a
  JS-initiated custom-scheme navigation **preserves the fragment**.
- **Server verification**: the ID token is verified server-side against
  Google's tokeninfo endpoint; the token's `aud` must equal the configured
  `MANA_GOOGLE_CLIENT_ID`. Display names are server-verified (like itch.io,
  stronger than Steam's client-supplied persona).
- **No native SDK needed**: this is pure OAuth — no Google Play Games
  Services, no Firebase, no native sign-in plugin (matching "we don't need
  something that complex").
- **Identity semantics**: provider is part of the player record
  (`UNIQUE(provider, provider_id)`). A Google login and an itch login are
  *distinct players* (same as Steam vs itch today) — no account linking
  exists. Same Google account on any device = same player, so rating, career
  stats, and a resumable run carry over. Steam identity does **not** follow
  to Android (no Steamworks in the WebView).

## Architecture

### Server — `google` provider (mirrors `itch`)

`server/src/services/authService.ts` is provider-agnostic: one `Authenticator`
per provider, then `findOrCreatePlayer` upsert + opaque bearer token. Adding
Google was:

- **`server/src/persistence/repositories.ts`** — `PlayerProvider` +=
  `"google"` (no migration; `UNIQUE(provider, provider_id)` just works).
- **`server/src/services/googleAuth.ts`** (new) — `createGoogleAuthClient({
  clientId, url?, fetch? })` → `validateIdToken` + `authenticator`. Validates
  via `GET https://oauth2.googleapis.com/tokeninfo?id_token=…` and requires:
  `aud === clientId`, `iss` in `{accounts.google.com, https://accounts.google.com}`,
  non-empty `sub` (the player's provider id), and unexpired `exp`.
  Network failure → 502 `internal_error`; anything else → 401
  `invalid_google_token`. (tokeninfo is the simple rate-limited path;
  cert/JWKS signature verification is a parked hardening step.)
- **`server/src/dto.ts`** — `parseAuthGoogleBody` (`{ idToken }`, non-empty,
  ≤ 16KB) + `AuthGoogleRequest`.
- **`server/src/errors.ts`** — `ApiErrorCode` += `"invalid_google_token"`.
- **`server/src/http/routes/auth.ts`** — `POST /auth/google` registered when
  `google.clientId` is set; `server/src/config.ts` (`MANA_GOOGLE_ENABLED`,
  `MANA_GOOGLE_CLIENT_ID`), `server/src/app.ts`, `server/src/index.ts` wiring;
  `compose.yaml` + `.env.example` pass-through.
- **`server/src/http/oauthRelayPage.ts`** (new) — the static OAuth relay page,
  served at `GET /oauth/callback` (`server/src/app.ts`). It forwards the URL
  hash to the opener (web `postMessage`) or to the app
  (`com.manabattle.app://oauth#…`). The credential never touches server logs.

### Client — login hub + Google login + Android transport

- **`phaser/src/Screens/Title/Components/arenaButton.ts`** — Electron (Steam
  available) → `steamAuth.loginWithSteam()` then the lobby (unchanged);
  everything else → the new **`multiplayer_login`** screen.
- **`phaser/src/Screens/MultiplayerLogin/MultiplayerLoginScreen.ts`** (new,
  route `multiplayer_login` in `Screens/ScreenManager.ts` + `Client.ts`) —
  the login hub: signed-in status line, **Sign in with Google** (web + Android,
  shown when a client id is baked into the build), **Sign in with itch.io**,
  **Log out** (only when a session exists — the game previously had no logout
  anywhere), and **Back**. Any successful login → `multiplayer_lobby`. Errors
  → dismissible modal.
- **`phaser/src/lib/googleAuth.ts`** (new) — `buildGoogleAuthUrl` (OIDC
  implicit: `response_type=id_token`, `scope=openid profile email`, `nonce`,
  `state`) + `createGoogleAuthClient` with injectable deps (fetch, storage,
  Android transport, popup hooks). `loginWithGoogle()` reuses a stored session
  → acquires an ID token → `POST /api/v1/auth/google` → persists via the
  shared `mana_auth_session` store. Acquisition: **Android** opens the system
  browser and receives the return via the relay + custom-scheme deep link;
  **web** (browser/itch.io embed) opens an OAuth **popup** and receives the
  return via the relay's cross-origin `postMessage` (origin + state verified —
  plain browser popups are fine; Google only blocks OAuth inside embedded
  WebViews and the JS library's in-iframe flows, neither of which we use).
- **`phaser/src/lib/oauthAndroid.ts`** (new) — the Capacitor OAuth transport:
  `Browser.open` (Chrome Custom Tab) + `App.addListener("appUrlOpen")`
  deep-link wait (with state-nonce check), cold-start launch-URL capture
  (`captureLaunchReturnIfPresent()` in `main.ts`), and
  `parseOAuthReturnUrl` (`#id_token` / `#access_token`). Capacitor plugins are
  **dynamically imported** so the web bundle and jest never load them.
- **`phaser/src/lib/itchAuth.ts`** — on Android (`isCapacitor()`), itch.io
  login routes through the same system-browser + relay + deep-link transport
  instead of the (impossible-in-WebView) popup.
- **`phaser/src/Utils/environment.ts`** — `isCapacitor()` (`window.Capacitor`).
- **`phaser/src/lib/authSession.ts`** — `AuthProvider` += `"google"`.
- **Re-auth fix** — `MultiplayerLobbyScreen` now catches 401
  (`RemoteServerError`) from profile/resume, clears the stale session, and
  sends the player to the login screen instead of a dead-end error modal
  (the 30-day bearer TTL has no refresh; previously a stale token trapped
  the player).

### Android — deep link

`android/app/src/main/AndroidManifest.xml` gains a `VIEW` intent filter on
`MainActivity` for `com.manabattle.app://oauth` (scheme `com.manabattle.app`,
host `oauth`). `@capacitor/app` + `@capacitor/browser` are phaser
dependencies (`@capacitor/app@^8.1.1`, `@capacitor/browser@^8.0.4`).
`npx cap sync android` preserves the manual manifest edit.

## One-time setup (human steps)

1. **Google Cloud OAuth client** — in Google Cloud Console, create an OAuth
   **Web application** client id (public — ships in the app; the **same client
   id** serves the web popup flow and the Android system-browser flow). Add
   `https://api.manabattle.com/oauth/callback` as an **Authorized redirect
   URI** and your Google account(s) as **test users** (until the OAuth
   consent screen is verified). Note: the OAuth consent screen must be set to
   "External" + Testing (or verified) for the flow to work for players. The
   **Authorized JavaScript origins** field can stay empty — this flow never
   uses the Google JS library (it's the plain OAuth redirect/popup flow).
2. **Server env** (root `.env`, and the VM's `/opt/mana-game/.env`):
   `MANA_GOOGLE_ENABLED=true`, `MANA_GOOGLE_CLIENT_ID=<the client id>`.
3. **itch.io OAuth app** — add `https://api.manabattle.com/oauth/callback` to
   the registered redirect URIs of the `Mana Battle Multiplayer` OAuth app
   (`https://itch.io/settings/oauth`). This one registration serves **both** the
   Android itch.io flow **and** the web popup flow (since 2026-09-02 the web flow
   also uses the relay as its callback — see [itchio-auth.md](itchio-auth.md)) —
   and it never changes on deploy, unlike the old game-iframe URL callback.
4. **CORS** — the Android WebView fetches from `https://localhost` (Capacitor
   default origin). The prod server currently runs `MANA_CORS_ORIGIN=*`
   (bearer-token auth, no cookies — safe). If the list is ever narrowed, add
   `https://localhost` (and `capacitor://localhost` if the scheme is ever
   changed).
5. **Android release build** — `make android-build` bakes
   `MANA_SERVER_URL` (defaults to `https://api.manabattle.com`) and reads
   `MANA_GOOGLE_CLIENT_ID` / `MANA_ITCH_CLIENT_ID` from the root `.env`
   (webpack DefinePlugin). It also **bumps `android/app/build.gradle`**
   (`versionCode` +1, `versionName` prompted interactively or via
   `VERSION=…`) so every upload carries a fresh, never-reused version code,
   then runs `./gradlew bundleRelease` to produce the AAB. The AAB is signed
   when the root `.env` sets `MANA_KEYSTORE_PATH=key.jks` (plus
   `MANA_KEYSTORE_STORE_PASSWORD` / `MANA_KEYSTORE_KEY_ALIAS` /
   `MANA_KEYSTORE_KEY_PASSWORD`; keystore at `android/key.jks`,
   gitignored — see docs/release-audit.md); otherwise it is unsigned and
   must be signed via Android Studio before upload.

## Config summary

| Env var | Where | Meaning |
|---|---|---|
| `MANA_GOOGLE_ENABLED` | `server/` | `true` registers `POST /api/v1/auth/google` (default `false`, explicit opt-in like itch) |
| `MANA_GOOGLE_CLIENT_ID` | `server/` + `phaser/` web & Android builds (webpack DefinePlugin) | Public Google OAuth client id; the server rejects tokens whose `aud` does not match |
| `MANA_SERVER_URL` | `phaser/` builds (webpack DefinePlugin) | Game-server base URL — also derives the OAuth relay URL (`<server>/oauth/callback`) |
| `MANA_CORS_ORIGIN` | `server/` | `*` today; add `https://localhost` if ever narrowed (Android WebView origin) |

## Testing & verification (per package)

```
server:  npm test && npm run typecheck && npm run build
phaser:  npm run test:ci && npm run typecheck && npm run lint
```

New tests: `server/test/googleAuth.test.ts` (tokeninfo mocked: aud/iss/sub/
exp, non-2xx → 401, network → 502, non-JSON, malformed credentials),
`server/test/auth.test.ts` `POST /auth/google` (happy path, repeat-login same
player, bad token 401, aud mismatch 401, malformed body 400 without calling
tokeninfo, route absent when disabled, rate limit),
`server/test/dto.test.ts` + `config.test.ts` extensions,
`server/test/oauthRelay.test.ts` (relay page served, scheme + postMessage
present), `phaser/src/lib/googleAuth.test.ts` (URL build, login POST +
persistence, stored-session reuse, not-configured, non-Android guard, server
rejection), `phaser/src/lib/oauthAndroid.test.ts` (return parsing, transport
with stubbed deps), `phaser/src/lib/itchAuth.test.ts` (Android path routes
through the relay deep link).

## D1 — local smoke (developer machine)

1. `make server-mp` (Steam key not needed for Google) with
   `MANA_GOOGLE_ENABLED=true MANA_GOOGLE_CLIENT_ID=<client id>` exported.
2. `curl -X POST http://127.0.0.1:8787/api/v1/auth/google -H 'Content-Type: application/json' -d '{}'`
   → 400 `invalid_google_token` (route registered).
3. `curl http://127.0.0.1:8787/oauth/callback` → the relay HTML.
4. Client: `npm run dev` in `phaser/` → Multiplayer → login screen → Log out
   visible when a session exists; Google button hidden in the browser (web =
   itch only).

## D2 — live Android smoke (pending; needs the one-time setup)

1. `make android-build` (bakes prod `MANA_SERVER_URL` + client ids from `.env`),
   `make android-open`, run on a device/emulator.
2. Multiplayer → login screen shows **Sign in with Google** →
   Chrome Custom Tab → pick account (already logged in on the device) →
   relay page → app reopens → lobby shows the Google profile.
3. itch.io button on Android → same relay flow → itch login.
4. Log out → status flips to "Not signed in", button disappears; sign in again
   → short-circuit to the lobby (stored session).
5. Second launch: Multiplayer → login screen shows "Signed in as …" → tap the
   provider button → lobby (no browser round-trip).
6. Web build unchanged: itch popup still works; Steam build unchanged
   (Electron → lobby directly).
7. `curl -X POST https://api.manabattle.com/api/v1/auth/google -d '{}'`
   → 400 `invalid_google_token` (route live on the VM).

## Risks & open questions

- **Google OAuth consent-screen state** — an unverified "External" consent
  screen limits sign-in to test users; players need the app verified or in
  production. Verify the console state before the first live smoke.
- **itch.io redirect-URI strictness** — the relay URL must be registered
  verbatim (same class of issue as the itch embed URL in itchio-auth.md).
- **Custom-scheme collisions** — `com.manabattle.app://` is app-unique; a
  malicious app could register the same scheme, but the credential is still
  validated server-side (`aud` for Google, profile fetch for itch), so
  interception is harmless.
- **Token expiry UX** — the 30-day bearer TTL has no refresh; the login
  screen + 401 bounce are the v1 mitigation. Token refresh is parked in the
  server's Phase 5 extras.
- **Account linking** — Google vs itch vs Steam players are distinct records;
  cross-provider unification is a separate future feature.
- **Google on the itch.io web embed** — shipped 2026-09-02 via the OAuth
  **popup** + the shared relay (plain browser popups from the embed are fine;
  Google blocks only the JS library's in-iframe flows and embedded WebViews,
  neither of which this flow uses). A live popup smoke test on the embed is
  still pending (the web Google button is the same `window.open` mechanism
  the itch popup already uses successfully there).

## Resume guide

Interrupted mid-implementation? Do this:

1. Read `AGENTS.md` (project entry), then this doc.
2. Check the checkboxes below — they mark exactly what is done/undone.
3. Unchecked tasks run in order A → B → C → D; each phase is independently
   verifiable with the commands in
   [Testing & verification](#testing--verification-per-package).
4. Cross-reference the existing itch provider as the template everywhere:
   `server/src/services/itchAuth.ts` ↔ `googleAuth.ts`;
   `phaser/src/lib/itchAuth.ts` ↔ `googleAuth.ts`; the popup flow ↔
   `oauthAndroid.ts` deep-link flow.
5. When landed: update the status line, tick all boxes, remove the AGENTS.md
   Task Queue entry, and update `docs/auth.md` + `docs/game-server.md`.

## Implementation phases

- [x] **A. Server `google` provider** — PlayerProvider, googleAuth service,
      DTO, ApiErrorCode, route, config, app/index wiring, compose + .env
      pass-through, tests (unit + HTTP).
- [x] **B. Login hub + re-auth** — `multiplayer_login` screen (Google/itch/
      logout/back), route + Client registration, i18n (all six catalogs),
      arena-button rewiring, lobby 401 → login-screen bounce.
- [x] **C. Android OAuth transport** — `oauthAndroid.ts` (Browser + App
      deep-link, cold-start capture), `googleAuth.ts` client, itchAuth
      Android path, relay page on the server, manifest intent filter,
      `@capacitor/app` + `@capacitor/browser`, main.ts boot capture.
- [x] **D. Build/deploy + docs** — webpack `MANA_GOOGLE_CLIENT_ID` define +
      guardrail, `make android-build` prod defaults, this doc + auth.md/
      game-server.md/building-and-running.md/server README updates.
- [ ] **D2. Live Android smoke test** (human; needs the one-time setup above).
