# Achievement System

The **Achievement System** handles unlocking Steam achievements based on game
progress and victory conditions. The **rules live in `core/`** (pure, fully
tested); `phaser/` keeps a thin adapter that talks to the Steamworks API.

## Architecture

- **Pure rules — `core/src/Achievements/`**
  - `victoryTier.ts` — `getVictoryTier(wins)` → `"bronze" | "silver" | "gold" | null`.
    Thresholds come from `core/src/math/Constants.ts`
    (`BRONZE_VICTORY_THRESHOLD` = 5, `SILVER_VICTORY_THRESHOLD` = 8,
    `GOLD_VICTORY_THRESHOLD` = 10).
  - `achievements.ts` — `VICTORY_ELIGIBLE_CRYSTALS`, `getAchievementId(crystal, tier)`
    (id format `TIER_CRYSTALNAME`, e.g. `GOLD_MANA_CRYSTAL`), and
    `getAchievementUnlocks(wins, coreCardId, config)` — returns the ids to
    unlock in cascade order (bronze → silver → gold). Returns `[]` when
    achievements are disabled, wins are below the bronze tier, or the core is
    not achievement-eligible.
  - `core/src/session/runComplete.ts` — `buildRunCompleteSession()` builds the
    terminal `game_over` / `victory` session that records the run's wins/losses.
- **Steam adapter — `phaser/src/Systems/AchievementSystem.ts`**
  - `checkVictoryAchievements(wins, coreCardId)` calls `getAchievementUnlocks(...)`
    (with `GAME_CONFIG.ENABLE_ACHIEVEMENTS` from `phaser/src/config.ts`) and
    activates each id via `window.steamworks.achievement.activate(id)`.
  - Guarded by `isSteamAvailable()`; when Steam is not initialized (e.g. in a
    browser) unlocking returns `false` silently. Logs use the `[Achievement]`
    prefix.

## Supported Crystals

Achievements are tracked per core crystal. Eligible crystals
(`VICTORY_ELIGIBLE_CRYSTALS`): `mana_crystal`, `critical_crystal`,
`protective_crystal`, `growth_crystal`, `purple_crystal`, `quickstone`.

## Victory Tiers

- **Bronze** (≥ 5 wins)
- **Silver** (≥ 8 wins)
- **Gold** (≥ 10 wins)

Unlocking a higher tier also unlocks the lower tiers (cascade order in
`getAchievementUnlocks`).

## Logic Flow

1. **Game end**: when a run completes, the session is finalized via
   `buildRunCompleteSession()` (`core/src/session/runComplete.ts`) and
   `checkVictoryAchievements(wins, coreCardId)` is called.
2. **Pure computation**: `getAchievementUnlocks()` decides which achievement
   ids should unlock (config: `GAME_CONFIG.ENABLE_ACHIEVEMENTS`).
3. **Unlock**: the phaser adapter calls `window.steamworks.achievement.activate(id)`
   for each id.
