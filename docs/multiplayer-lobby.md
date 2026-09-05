# Multiplayer Lobby — Profile Endpoint & Hub Screen

**Status**: ✅ **Implemented** (2026-08-20) — server `GET /api/v1/players/me` +
`run_completions` persistence, client `MultiplayerLobbyScreen`, and the
title-screen entry wired through it. **Updated 2026-09-xx**: display-name
changes (`PATCH /api/v1/players/me`, 30-day cooldown) + lobby rename UI.
**Created**: 2026-08-20
**Scope**: `server/` (profile endpoint + run-completions stats) + `phaser/`
(lobby hub screen).
**Related**: [game-server.md](game-server.md) (backend plan, API v1 table),
[auth.md](auth.md) (auth design), [itchio-auth.md](itchio-auth.md) (web-build
login). This doc is the reference for the code comments in `playerService.ts`,
`routes/players.ts`, and `MultiplayerLobbyScreen.ts`.

## Purpose

After login (Steam, itch.io, or Google) the player used to land directly in
crystal selection (or straight into a mid-run session). The multiplayer lobby
is a hub between the title screen and a multiplayer run with two tabs —
**LOBBY** (first) and **RANKING** — plus an adaptive PLAY button and BACK that
stay visible on both tabs. The LOBBY tab shows:

- **identity** — display name (falling back to the provider id), provider badge,
- **rating** — the current ladder rating (starts at `DEFAULT_PLAYER_RATING`
  = 1000),
- **career + season victory counts** — gold/silver/bronze runs completed, all
  time vs. since the 1st of the current month (UTC),
- **rename** — a CHANGE NAME button (with a countdown hint while the 30-day
  cooldown applies) so players can pick a handle instead of their provider
  name — Google sign-in surfaces the Google profile (real) name by default,
  which is exactly what players want to replace.

The **RANKING** tab shows the rating leaderboard: "Your ranking: #x" in gold
above a paginated list (20 rows per page in two columns of ten, PREV/NEXT +
"Page x of y"), with the viewer's own row highlighted. PLAY ("RESUME" when
the server has a resumable run, "NEW GAME" otherwise) and BACK stay visible
on both tabs.

## Endpoint — `GET /api/v1/players/ranking`

Bearer-authenticated. Query params `page` (default 1) and `pageSize`
(default 20, max 50) — anything else is `400 invalid_request`. Response:

```ts
type RankingPage = {
  entries: { rank: number; playerId: string; displayName: string; rating: number }[];
  page: number;
  pageSize: number;
  totalPlayers: number; // includes the viewer when they have no rating row yet
  totalPages: number;
  yourRank: number;     // exact even before the viewer's first run
  yourRating: number;   // the default rating when the viewer has no row yet
};
```

Leaderboard order is rating DESC with a playerId ASC tiebreak
(`RatingRepo.listTop` / `count` / `countAbove`, implemented by all three
backends). Entry names resolve through the player repo with the same
display-name-or-provider-id fallback as the lobby. The viewer's rank is
`1 + countAbove(effectiveRating, viewerId)`, so it needs no rating row —
a player who never played still sees their (default-rated) position.

## Endpoint — `GET /api/v1/players/me`

Bearer-authenticated (same middleware as the session endpoints). No request
body. Response:

```ts
type PlayerProfile = {
  player: {
    playerId: string;      // server-side player uuid
    displayName?: string;  // steam persona / itch username / google profile name
    providerId: string;    // provider-scoped identity (steam64 / itch id / google sub)
    provider: "steam" | "itch" | "google";
  };
  rating: number;                 // current rating (DEFAULT_PLAYER_RATING if unset)
  career: VictoryCounts;          // tiered counts across all completed runs
  season: VictoryCounts;          // counts since the 1st of the current month (UTC)
  hasActiveSession: boolean;      // resumable run exists (matches GET /sessions/current)
  displayNameChange: {
    allowed: boolean;             // may the player rename right now?
    nextAllowedAt?: number;       // epoch ms — present exactly when !allowed
  };
};

type VictoryCounts = { bronze: number; silver: number; gold: number };
```

Errors: `401` without a valid bearer token; `404 player_not_found` if the token
resolves to no player.

## Endpoint — `PATCH /api/v1/players/me` (rename)

Bearer-authenticated. Body `{ displayName: string }` — returns the **refreshed
full `PlayerProfile`** (same shape as GET) so the client re-renders in one
round trip.

Enforcement (server `playerService.ts`):

- **Validation** (`validateDisplayName`): trimmed length 2–24 characters, no
  control characters → else `400 invalid_display_name`.
- **Cooldown**: at most one change per `NAME_CHANGE_COOLDOWN_MS` (30 days),
  tracked by `Player.displayNameUpdatedAt` (unset = never renamed, so the
  first change is always free). A second change within the window →
  `429 name_change_cooldown` (message includes the next allowed time).
- The rename is stamped on the player (`PlayerRepo.updateDisplayName`) and
  immediately visible to other players: ghosts snapshot the display name, so
  `enemyPlayerName` in combat uses the current name.
- Providers never overwrite a chosen name: `findOrCreatePlayer` returns the
  existing player untouched on repeat logins, so re-signing in with Google
  keeps the custom handle.

Both memory (`memory.ts`) and SQLite (`sqlite.ts`) player repos implement
`updateDisplayName`; SQLite schema creation includes a guarded migration that
adds `display_name_updated_at` to existing `players` tables.

## Data model — run completions

A completed run is recorded **exactly once**, when core transitions the session
to a terminal phase (`victory` / `game_over`), in the same
`end_combat` handling that applies the rating delta
(`sessionService` → `playerStatsRepo.recordRunCompletion`).

```ts
type RunCompletion = {
  sessionId: string;              // uniqueness key — re-recording is idempotent
  playerId: string;
  tier: MultiplayerVictoryTier | null; // gold/silver/bronze, null below 5 wins
  wins: number;
  completedAt: number;            // epoch ms — compared against the season boundary
};
```

- **Persistence**: `PlayerStatsRepo` interface + in-memory impl
  (`memory.ts`, `Map<sessionId, RunCompletion>`) and SQLite impl
  (`sqlite.ts`, `run_completions(session_id PK, player_id, tier, wins,
  completed_at)` + index on `(player_id, completed_at)` for window queries).
  Both are idempotent per `session_id` (SQLite PK / Map key), so even a
  re-entrant completion path can't double-count.
- **Victory tiers** come from the rating service
  (`getMultiplayerVictoryTier`): gold ≥ 10 wins, silver ≥ 8, bronze ≥ 5,
  `null` below bronze. Below-bronze runs are stored (for future stats) but
  never counted.
- **Season boundary** (`getSeasonStartEpochMs`): the first millisecond of the
  current calendar month in UTC. `career` uses `sinceEpochMs = 0`; `season`
  uses the boundary. The client mirrors this in `RemoteServer.ts` only as a
  pass-through — the server is the single source of truth.

## Client

- `phaser/src/Screens/MultiplayerLobby/MultiplayerLobbyScreen.ts` — the screen
  module (route `multiplayer_lobby`, registered in `ScreenManager.ts` +
  `Client.ts`). `create()` loads the profile via
  `remoteServer.getProfile(...)` (which needs the persisted auth session),
  renders the three panels + action buttons, and shows a dismissible error
  modal on failure.
- `Components/` — `profilePanel.ts` (identity + rating, with an in-place
  `update()`), `statsPanel.ts` (tiered victory rows, used twice for career +
  season), `actionButtons.ts` (adaptive PLAY / BACK), `changeName.ts`
  (CHANGE NAME button + countdown hint driven by `displayNameChange`),
  `renameModal.ts` (DOM-based text-input modal with client-side validation).
- Rename flow: CHANGE NAME → modal collects the name → `remoteServer
  .updateDisplayName(name)` (`PATCH /api/v1/players/me`) → on success the
  server-returned profile updates the panels in place (no rebuild), the
  persisted auth-session `displayName` is synced (the login screen reads it),
  and the cooldown hint appears. A `429 name_change_cooldown` shows a
  localized cooldown message; a `401` triggers the lobby's re-auth path.
- `arenaButton.ts` (title screen) now navigates to `multiplayer_lobby` after a
  successful login instead of jumping straight into a run; the lobby owns the
  RESUME / NEW GAME decision. RESUME fetches the session
  (`remoteServer.getSession`), patches client state, and enters the
  battleground — including mid-combat (`combatState`).
- `rankingPanel.ts` — the RANKING tab content: the golden "Your ranking: #x"
  header, the two-column paginated leaderboard (lazy first fetch on tab show,
  PREV/NEXT refetch, stale-response guard via a generation counter +
  destroyed flag), and the 401 → re-login path via the screen's `goToLogin`.
  The screen wraps the old panels in one `lobbyContent` container and toggles
  it against the ranking container with LOBBY/RANKING tab buttons (the active
  tab's button is disabled); PLAY/BACK stay outside both tabs.
- i18n: all `lobby.*` keys (incl. the `rename*` family) exist in all six
  catalogs (`en`, `es`, `jp`, `pt`, `cn`, `ru`).

## File map

| Area | Files |
|---|---|
| Server endpoints | `server/src/http/routes/players.ts` (`GET` + `PATCH /me`, `GET /ranking`), `server/src/services/playerService.ts` (profile assembly + rename validation/cooldown + `getRankingPage`), `server/src/dto.ts` (`parseRankingQuery`) |
| Server persistence | `server/src/persistence/repositories.ts` (`PlayerRepo.updateDisplayName`, `Player.displayNameUpdatedAt`), `memory.ts`, `sqlite.ts` (incl. `display_name_updated_at` migration) |
| Server wiring | `server/src/app.ts` (player router + `playerStatsRepo` dep), `server/src/services/sessionService.ts` (completion recording), `server/src/services/rating.ts` (tier type re-export), `server/src/dto.ts` (`parseUpdateDisplayNameBody`), `server/src/errors.ts` (`invalid_display_name`, `name_change_cooldown`) |
| Server tests | `server/test/players.test.ts`, `playerService.test.ts`, `playerStatsRepo.test.ts`, `sessionFlow.test.ts`, `sqlite.test.ts`, `dto.test.ts`, `ranking.test.ts` (leaderboard HTTP: order, pagination, viewer rank, fallbacks, validation) |
| Client adapter | `phaser/src/RemoteServer.ts` (`getProfile`, `updateDisplayName`, `getRanking`, `MultiplayerProfile`/`RankingPage` + shape guards), `RemoteServer.test.ts` |
| Client screen | `phaser/src/Screens/MultiplayerLobby/` (`MultiplayerLobbyScreen.ts` (LOBBY/RANKING tabs) + `Components/`: `profilePanel.ts`, `statsPanel.ts`, `actionButtons.ts`, `changeName.ts`, `renameModal.ts`, `rankingPanel.ts`) |
| Client wiring | `phaser/src/Screens/Title/Components/arenaButton.ts`, `Screens/ScreenManager.ts` (route), `Client.ts` (registry), `i18n/*.json` |

## Verification

```sh
cd server && npm test && npm run typecheck && npm run build
cd phaser && npm run test:ci && npm run typecheck && npm run lint
```

Manual smoke (Steam Electron, itch web, or Google Android/web): title →
MULTIPLAYER → login → lobby shows the profile/rating/stats → RANKING tab
shows "Your ranking: #x" + the leaderboard (PREV/NEXT page through it) →
CHANGE NAME opens
the modal → a valid name updates the panel and shows the countdown hint; a
second attempt within 30 days is rejected with the cooldown message (and the
button stays disabled with "Next change available: <date>"). NEW GAME goes to
crystal selection; a mid-run player sees RESUME and lands back in the
battleground (incl. mid-combat); after a run finishes the counts increment and
the lobby is the only path back into a new run.


