# Project Improvement Points

This document outlines potential areas for improvement and refactoring within the Mana Game project.

## 1. Code Structure and Design Patterns

*   **Effect Invocation Consistency (`DebugScene.ts`, `Effects/`):**
    *   In `DebugScene.ts`, some effects are instantiated (`new effects.GlowingOrb()`) while others are called as functions (`effects.fireballEffect()`). Consider standardizing the invocation pattern for effects if a consistent API is desired. This could involve making all effects classes or all effects functions, or providing a clear distinction for when to use which.
*   **`DebugScene.ts` Effect Dispatch:**
    *   The `create` method in `DebugScene.ts` uses a long `if/else if` chain to trigger different effects based on URL parameters. This can become unwieldy as more effects are added.
    *   **Suggestion:** Refactor this to use an object/map lookup where the effect name (from the URL parameter) maps directly to a function that creates/triggers the effect. This would be more scalable and readable.
        ```typescript
        // Example structure in DebugScene.ts
        const effectRunners: Record<string, () => void> = {
            "arcanemissile": () => { /* ... arcane missile logic ... */ },
            "criticaldamagedisplay": () => { /* ... critical damage display logic ... */ },
            // ... other effects
        };

        const effectRunner = effectRunners[effect];
        if (effectRunner) {
            effectRunner();
        } else {
            console.warn(`Unknown effect: ${effect}`);
        }
        ```
*   **Global State (`Models/State.ts`):**
    *   The game previously relied more heavily on a global `window.state` object. An initial step towards more structured state management has been taken by introducing `Models/OptionsStore.ts` to manage game configuration options (sound, debug, speed, etc.), removing them from the main global state.
    *   The core game data (e.g., `gameData`, `battleData`) still resides in `window.state`, accessed via `getState()` and `setState()`. While convenient for Phaser development and debugging, direct global state modification can make state changes harder to track and debug in larger applications.
    *   **Suggestion:** For future scalability, continue to ensure that mutations to the remaining global state (`gameData`, `battleData`) are predictable, ideally through events or dedicated state update functions. For very large projects, a more formal state management library or further modularization of state (similar to `OptionsStore`) could be considered. The current approach with centralized accessors in `State.ts` for the main game data is an intermediate step.
*  
*   **Singleton Management (`Models/Board.ts`):**
    *   The `PlayerBoard` uses a module-level singleton pattern (`_sharedPlayerBoardInstance`). This is a common and acceptable pattern. Ensure `initializeSharedPlayerBoard` is consistently called at the correct lifecycle point (e.g., scene initialization).

## 2. Refactoring and DRY (Don't Repeat Yourself)

*   **`impactEffect` Duplication (`Effects/explodeEffect.ts`, `Effects/fireballEffect.ts`):**
    *   The `impactEffect` helper function was duplicated. It appears `/Users/momo/dev/mana-game/phaser/src/Effects/impactEffect.ts` is intended as the single source of truth.
    *   **Action:** Ensure all usages of `impactEffect` point to this centralized version and remove the local copies from `explodeEffect.ts` and `fireballEffect.ts`.
*   **Explosion Offset Vectors (`Effects/explodeEffect.ts`, `Effects/fireballEffect.ts`):**
    *   The array of `Vec2` objects used for positioning secondary impact effects in `explodeEffect` and `fireballEffect` is identical.
    *   **Suggestion:** Define this array as a shared constant in a relevant constants file or a utility module to avoid duplication and ensure consistency.
*   **Purchase Validation Logic (`Scenes/Battleground/Systems/BattlegroundEventSystem.ts`):**
    *   The methods `_onShopItemClickPurchaseRequested` and `_onShopItemDragPurchaseRequested` contain similar validation logic (checking gold, party size, slot availability).
    *   **Suggestion:** Refactor this common validation logic into a separate private method within `BattlegroundEventSystem` or a dedicated `ShopPurchaseValidator` service to reduce redundancy.

## 3. Configuration and Magic Numbers

*   **Effect/Animation Timings:**
    *   Several effects and animations use hardcoded numerical values for durations, delays, or other parameters (e.g., `delay(scene, 600)` in `Effects/impactEffect.ts`, various particle emitter settings).
    *   **Suggestion:** Review these "magic numbers." If they represent configurable game design choices, move them to `constants.ts` or a relevant constants file. If they should scale with game speed, ensure they are divided by `state.options.speed` (as is done in the `tween` utility).
*   **Particle Emitter Settings (`Effects/summonEffect.ts`):**
    *   The `summonEffect` has `frequency: lifespan / 10` and `quantity: 4`, but a comment suggests "Emit all at once." This is contradictory.
    *   **Suggestion:** Clarify the intended emission behavior. For "all at once," consider setting `frequency` to 0 or a very small value and `quantity` to the total number of particles, or use the particle emitter's `explode` method if suitable.

## 4. Error Handling and Robustness

*   **Non-Null Assertions (`!`):**
    *   The codebase uses non-null assertions (e.g., `getSkill()!`, `getChara()!`) in several places. While this can be acceptable if the developer is certain the value will exist, it bypasses TypeScript's null checks.
    *   **Suggestion:** In critical paths or where data integrity is paramount, consider replacing assertions with explicit checks and error handling (e.g., throwing an error, returning `null`/`undefined` and handling it gracefully, or logging a warning). This can make the code more robust to unexpected states.
*   **`UNIT_EVENTS` Array (`Models/UnitEvents.ts`):**
    *   The `UNIT_EVENTS` array is manually maintained and must be kept in sync with the `UnitEvents` type definition. This is prone to error.
    *   **Suggestion:** Explore ways to generate this array programmatically from the `UnitEvents` type at build time or runtime to ensure consistency, or use a pattern that doesn't require a separate array if possible (though often such arrays are useful for iteration).

## 5. Input Handling

*   **DOM Interaction (`Systems/Controls/Controls.ts`):**
    *   The `Controls.ts` system binds keyboard inputs to click events on DOM elements (`document.querySelector(selector)?.click()`).
    *   **Suggestion:** If these controls are intended for in-game actions within the Phaser canvas, it's generally more idiomatic and robust to use Phaser's built-in keyboard input system (`this.input.keyboard.on('keydown-KEY', ...)`). If these are for HTML UI elements outside the canvas, the current approach is fine, but ensure the selectors are stable.

## 6. System Enhancements

*   **AI System (`Systems/AI/AI.ts`):**
    *   The `AI.ts` system is currently a placeholder.
    *   **Action:** Implement AI logic for CPU-controlled units.
*   **Audio System (`Scenes/Battleground/Systems/Audio.ts`, `preload.ts`):**
    *   Audio loading in `preload.ts` is mostly commented out, and `BattlegroundAudioSystem_init` is empty.
    *   **Action:** Fully integrate audio assets and implement playback logic within the audio system.
*   **Tooltip Sizing (`UI/Tooltip.ts`):**
    *   The `Tooltip` class currently uses `FIXED_TOOLTIP_WIDTH` and `FIXED_TOOLTIP_HEIGHT`.
    *   **Suggestion:** If more flexibility is needed, consider re-implementing dynamic sizing based on the title and description content, while still respecting screen boundaries. This would involve calculating text dimensions after setting the content.
*   **`CharaManager.getSurroundingAllies` (`Scenes/Battleground/Systems/CharaManager.ts`):**
    *   This function uses `Phaser.Math.Distance.BetweenPoints` (Euclidean distance). For grid-based games, if only cardinal or diagonal neighbors are required, a simpler check based on coordinate differences (`Math.abs(dx) <= 1 && Math.abs(dy) <= 1`) might be more direct and performant than calculating square roots.

## 7. Testing

*   **Coverage:** The project includes unit tests for `StateSelectors` and `utils`, which is excellent.
*   **Suggestion:** Continue to expand test coverage, particularly for:
    *   Core game logic (e.g., combat resolution, damage calculation).
    *   `TraitSystem` evaluation.
    *   State mutation functions.
    *   Boundary conditions in various systems.

## 8. Minor Optimizations and Code Clarity

*   **`EnergyBeam.updateBeam` (`Effects/EnergyBeam.ts`):**
    *   The method recalculates vectors (`vec`, `normalized`, `normal`) on every call. If a beam's start/end points are static after creation, these could be cached. (This is a minor point and depends on usage patterns).
*   **`arcaneMissile` Effect (`Effects/arcaneMissile.ts`):**
    *   The `duration * 2` for the delay seems arbitrary without explicit reasoning. Clarify or link to a constant if it has a specific meaning.
    *   The default `colors` array includes black (`0x000000`), which might make particles invisible if alpha is also fading. Review if this is intended.
*   **`isInside` in `Models/Geometry.ts`:**
    *   Creates a new `Phaser.Geom.Rectangle` on every call. If used in a very high-frequency loop, and the rectangle dimensions are stable, consider caching the Rectangle object. For typical UI or infrequent checks, it's fine.

By addressing these points, the project can become even more robust, maintainable, and easier to extend.
