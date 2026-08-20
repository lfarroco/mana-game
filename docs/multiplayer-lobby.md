# Multiplayer Lobby — Profile Endpoint & Hub Screen

**Status**: ✅ **Implemented** (2026-08-20) — server `GET /api/v1/players/me` +
`run_completions` persistence, client `MultiplayerLobbyScreen`, and the
title-screen entry wired through it.
**Created**: 2026-08-20
**Scope**: `server/` (profile endpoint + run-completions stats) + `phaser/`
(lobby hub screen).
**Related**: [game-server.md](game-server.md) (backend plan, API v1 table),
[auth.md](auth.md) (auth design), [itchio-auth.md](itchio-auth.md) (web-build
login). This doc is the reference for the code comments in `playerService.ts`,
`routes/players.ts`, and `MultiplayerLobbyScreen.ts`.

## Purpose

After login (Steam or itch.io) the player used to land directly in crystal
selection (or straight into a mid-run session). The multiplayer lobby is a hub
between the title screen and a multiplayer run that shows:

- **identity** — display name (falling back to the provider id), provider badge,
- **rating** — the current ladder rating (starts at `DEFAULT_PLAYER_RATING`
  = 1000),
- **career + season victory counts** — gold/silver/bronze runs completed, all
  time vs. since the 1st of the current month (UTC),
- **an adaptive PLAY button** — "RESUME" when the server has a resumable run,
  "NEW GAME" otherwise, plus BACK to the title screen.

## Endpoint — `GET /api/v1/players/me`

Bearer-authenticated (same middleware as the session endpoints). No request
body. Response:

```ts
type PlayerProfile = {
  player: {
    playerId: string;      // server-side player uuid
    displayName?: string;  // steam persona / itch username
    providerId: string;    // provider-scoped identity (steam64 / itch id)
    provider: "steam" | "itch";
  };
  rating: number;                 // current rating (DEFAULT_PLAYER_RATING if unset)
  career: VictoryCounts;          // tiered counts across all completed runs
  season: VictoryCounts;          // counts since the 1st of the current month (UTC)
  hasActiveSession: boolean;      // resumable run exists (matches GET /sessions/current)
};

type VictoryCounts = { bronze: number; silver: number; gold: number };
```

Errors: `401` without a valid bearer token; `404 player_not_found` if the token
resolves to no player.

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
- `Components/` — `profilePanel.ts` (identity + rating), `statsPanel.ts`
  (tiered victory rows, used twice for career + season), `actionButtons.ts`
  (adaptive PLAY / BACK).
- `arenaButton.ts` (title screen) now navigates to `multiplayer_lobby` after a
  successful login instead of jumping straight into a run; the lobby owns the
  RESUME / NEW GAME decision. RESUME fetches the session
  (`remoteServer.getSession`), patches client state, and enters the
  battleground — including mid-combat (`combatState`).
- i18n: all `lobby.*` keys exist in all six catalogs (`en`, `es`, `jp`, `pt`,
  `cn`, `ru`).

## File map

| Area | Files |
|---|---|
| Server endpoint | `server/src/http/routes/players.ts`, `server/src/services/playerService.ts` |
| Server persistence | `server/src/persistence/repositories.ts` (`PlayerStatsRepo`, `RunCompletion`, `VictoryCounts`), `memory.ts`, `sqlite.ts` |
| Server wiring | `server/src/app.ts` (player router + `playerStatsRepo` dep), `server/src/services/sessionService.ts` (completion recording), `server/src/services/rating.ts` (tier type re-export) |
| Server tests | `server/test/players.test.ts`, `playerService.test.ts`, `playerStatsRepo.test.ts`, `sessionFlow.test.ts` |
| Client adapter | `phaser/src/RemoteServer.ts` (`getProfile`, `MultiplayerProfile`, shape guard), `RemoteServer.test.ts` |
| Client screen | `phaser/src/Screens/MultiplayerLobby/` (`MultiplayerLobbyScreen.ts` + `Components/`) |
| Client wiring | `phaser/src/Screens/Title/Components/arenaButton.ts`, `Screens/ScreenManager.ts` (route), `Client.ts` (registry), `i18n/*.json` |

## Verification

```sh
cd server && npm test && npm run typecheck && npm run build
cd phaser && npm run test:ci && npm run typecheck && npm run lint
```

Manual smoke (Steam Electron or itch web): title → MULTIPLAYER → login → lobby
shows the profile/rating/stats → NEW GAME goes to crystal selection; a
mid-run player sees RESUME and lands back in the battleground (incl.
mid-combat); after a run finishes the counts increment and the lobby is the
only path back into a new run.


