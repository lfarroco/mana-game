# Achievement System

The **Achievement System** handles unlocking Steam achievements based on game progress and victory conditions.

## Architecture

The system is implemented in `phaser/src/Systems/AchievementSystem.ts`.

It interacts directly with the **Steamworks API** exposed via Electron (`window.steamworks.achievement`).

## Key Concepts

### Victory Tiers
Achievements are tiered based on the number of wins in a run:
*   **Bronze** (5+ wins)
*   **Silver** (8+ wins)
*   **Gold** (10+ wins)

### Core Crystals
Achievements are tracked per specific Core Crystal (the unit you start with).
Supported crystals:
*   `mana_crystal`
*   `critical_crystal`
*   `protective_crystal`
*   `growth_crystal`
*   `purple_crystal`
*   `quickstone`

### Achievement IDs
Achievement IDs follow the format: `TIER_CRYSTALNAME`.
*   Example: `GOLD_MANA_CRYSTAL`
*   Example: `BRONZE_QUICKSTONE`

## Logic Flow

1.  **Game End**: When a game ends, `checkVictoryAchievements(wins, coreCardId)` is called.
2.  **Validation**:
    *   Checks if `GAME_CONFIG.ENABLE_ACHIEVEMENTS` is true (disabled in Demo).
    *   Checks if the player has enough wins for a tier.
    *   Checks if the core crystal is eligible for achievements.
3.  **Unlocking**:
    *   Calculates which tiers should be unlocked (e.g., Gold also unlocks Silver and Bronze).
    *   Calls `window.steamworks.achievement.activate(id)` to unlock them on Steam.

## Debugging

*   The system logs to the console with the prefix `[Achievement]`.
*   If Steam is not initialized (e.g., running in browser), it logs what *would* have been unlocked.
