# Guest Authentication

This document explains how the "Play as Guest" feature works in Mana Battle.

## Overview

Players can enter the Arena (multiplayer) without creating an account by clicking "Play as Guest". This creates an anonymous Supabase session that gives the player a persistent identity for the current session.

## Flow

1. **UI** — The "Play as Guest" button is rendered in `ArenaLoginScene` (`src/Engine/Scenes/ArenaLobby/ArenaLoginScene.ts`). Clicking it calls `handleGuest()`.

2. **`handleGuest()`** — Calls `handleAuthGuest()` from `MultiplayerManager.ts`, then on success:
   - Saves the returned player ID to `localStorage` under the key `"mana_player_id"`.
   - Transitions to the `ARENA_LOBBY` scene.
   - On failure, shows an error modal.

3. **`handleAuthGuest()`** (`src/Multiplayer/MultiplayerManager.ts`) — Core auth logic:
   - Calls `supabase.auth.signInAnonymously()` to create an anonymous Supabase session.
   - Stores the session user ID in the module-level `playerId` variable via `updatePlayerId()`.
   - Calls `getPlayerProfile()` to ensure a row exists in the `players` table (the server lazy-creates it if missing).
   - Returns a `PlayerProfile` object: `{ id, username: "Guest", rating: 1000, matches_played: 0 }`.

## Player Profile

Guest accounts are given default values:

| Field            | Value     |
|------------------|-----------|
| `username`       | `"Guest"` |
| `rating`         | `1000`    |
| `matches_played` | `0`       |

In the lobby UI, if no username is set the display falls back to `Guest#<first 4 chars of ID>`.

## Persistence

The player ID is stored in `localStorage` (`"mana_player_id"`). On subsequent visits, `getPlayerProfile()` looks up the existing row in Supabase and returns it, so a guest's rating and match history persist across sessions as long as the same browser/device is used and `localStorage` is not cleared.

## Upgrading a Guest Account

`LoginModal.ts` contains logic to link a guest session to a full email/password account, allowing a guest to "upgrade" without losing their history. It reads the existing guest session from Supabase before performing the link.

## Key Files

| File                                              | Role                                       |
|---------------------------------------------------|--------------------------------------------|
| `src/Engine/Scenes/ArenaLobby/ArenaLoginScene.ts` | Button creation, `handleGuest()` method    |
| `src/Multiplayer/MultiplayerManager.ts`           | `handleAuthGuest()`, `getPlayerProfile()`  |
| `src/Engine/Scenes/ArenaLobby/ArenaLobbyScene.ts` | Guest display name fallback (`Guest#xxxx`) |
| `src/Engine/Scenes/ArenaLobby/LoginModal.ts`      | Guest-to-account upgrade logic             |
