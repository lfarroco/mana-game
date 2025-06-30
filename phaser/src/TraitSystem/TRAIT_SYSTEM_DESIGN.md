# Trait System Design Document

## 1. Overview

The Trait System is designed to provide special abilities, characteristics, and passive or reactive behaviors to game entities. It is an event-driven system that allows for modular and extensible creation of complex game mechanics.

## 2. Guiding Principles

*   **Modularity:** Traits are composed of smaller, reusable "effects." New traits can be created by combining existing effects or by adding new, specific effect implementations.
*   **Data-Driven:** Trait definitions (what a trait is and what effects it has) are separated from the logic of how those effects are executed. This allows trait definitions to be potentially loaded from external files (e.g., JSON).
*   **Event-Driven Architecture:** Traits react to game events (e.g., "on attack," "on turn start," "on unit death"). This decouples trait logic from the core game loop and other systems.
*   **Extensibility:** The system is designed to be easily extended with new:
    *   Trait definitions
    *   Effect implementations
    *   Condition types
    *   Target selectors
*   **Clarity and Separation of Concerns:** Different parts of the system have distinct responsibilities:
    *   Defining trait data structures.
    *   Registering and looking up definitions and implementations.
    *   Resolving targets for effects.
    *   Checking conditions for effects.
    *   Executing the actual effect logic.
    *   Listening to game events and dispatching them to the trait processing logic.

## 3. Core Concepts

*   **Trait (`TraitDefinition`):**
    *   A blueprint for a specific ability or characteristic.
    *   Contains an ID, name, description, categories, and a list of `TraitEffectInstanceData`.
    *   Defined in `TraitEffectSystem.ts`.
*   **Trait Instance (`TraitData`):**
    *   An instance of a `TraitDefinition` attached to a `Unit` or `Relic`.
    *   Contains the `TraitId` and any instance-specific parameters that might override or supplement the defaults in the `TraitDefinition` or its `TraitEffectInstanceData`.
    *   Defined in `Traits.ts`.
*   **Effect Instance (`TraitEffectInstanceData`):**
    *   A specific effect that a trait will execute.
    *   Links to an `effectId` (which maps to an implementation), specifies an `eventTrigger`, an optional `targetSelector`, optional `conditions`, and any effect-specific parameters.
    *   Defined in `TraitEffectSystem.ts`.
*   **Effect Implementation (`TraitEffectFn`):**
    *   A function that contains the actual logic for an effect (e.g., dealing damage, applying a status, healing).
    *   Registered with the system using an `effectId`.
    *   Implementations reside in `Systems/TraitEffects/Implementations.ts`.
    *   Receives a `TraitEffectContext` providing all necessary information.
*   **Event (`GameEvents` & Payloads):**
    *   Occurrences in the game that can trigger trait effects (e.g., `TRAIT_EVAL_ATTACK_BY_ME`, `TRAIT_EVAL_GLOBAL_BATTLE_START`).
    *   Events carry payloads (`EventPayloads.ts`) with relevant data (e.g., attacker, target, damage amount).
*   **Event Trigger (`eventTrigger` in `TraitEffectInstanceData`):**
    *   A string (matching a `UnitEventKeys` or similar) that specifies which game event an effect should respond to.
*   **Condition (`TraitConditionInstanceData` & `TraitConditionFn`):**
    *   A gate that determines if an effect should execute.
    *   `TraitConditionInstanceData` defines the type of condition and its parameters.
    *   `TraitConditionFn` is the function that evaluates the condition.
    *   Managed by `TraitEffectSystem.ts`.
*   **Target Selector (`targetSelector` in `TraitEffectInstanceData`):**
    *   A string that defines how to determine the `Unit`(s) an effect should apply to.
    *   **Simplified Enemy Targeting:** All enemy selectors ("enemy", "closest_enemy", "all_enemies") now return the closest enemy for gameplay simplicity.
    *   **Positional Allied Targeting:** Allied selectors retain full positional logic for formation strategy (e.g., "allies_adjacent", "ally_left", "all_allies_in_row").
    *   **Guild-Wide Effects:** Use "enemy_guild" for effects that need ALL enemies (morale, area damage).
    *   Resolved by `resolveTargets` in `TraitEffectSystem.ts`.
*   **Source (`sourceUnit` or `sourceRelic` in `TraitEffectContext`):**
    *   The `Unit` or `Relic` that possesses the trait being processed.
*   **Context Objects:**
    *   `TraitEventContext` (in `Traits.ts`): Used by `processTraitEvent` for the overall event handling.
    *   `TraitEffectContext` (in `TraitEffectSystem.ts`): Passed to individual `TraitEffectFn` and `TraitConditionFn` implementations.

## 4. Architecture & Data Flow

1.  **Initialization:**
    *   Trait definitions are loaded (e.g., from JSON or code) and registered via `TraitSystem.initializeTraitsFromData`.
    *   Effect implementations (`TraitEffectFn`) are registered via `registerTraitEffectImplementation`.
    *   Condition implementations (`TraitConditionFn`) are registered via `registerTraitConditionImplementation`.
    *   Event listeners are set up by `setupTraitEventListeners`.

2.  **Event Occurs:**
    *   A game system (e.g., combat, unit movement) emits a `GameEvent` with an appropriate payload.

3.  **Event Listener Triggered (`TraitSystemEventListeners.ts`):**
    *   The corresponding event listener catches the `GameEvent`.
    *   It calls one of the `run...Traits` functions (e.g., `runUnitEventTraits`, `runAttackEventTraits`) from `Traits.ts`, passing the event key, scene, state, and payload.

4.  **Trait Processing (`Traits.ts` - `processUnitTraitsForEvent` & `processTraitEvent`):**
    *   The `run...Traits` function iterates through the traits of the relevant `Unit`(s) or `Relic`(s).
    *   For each trait instance (`TraitData`), `processTraitEvent` is called.
    *   `processTraitEvent`:
        *   Retrieves the `TraitDefinition` for the current trait.
        *   Iterates through each `TraitEffectInstanceData` in the definition.
        *   **Match Event:** Checks if the `effectInstance.eventTrigger` matches the current `eventKey`.
        *   If matched:
            *   **Resolve Targets:** Calls `TraitEffectSystem.resolveTargets` to determine the target `Unit`(s) for the effect.
            *   **Create Context:** Constructs a `TraitEffectContext`.
            *   **Check Conditions:** Calls `TraitEffectSystem.checkConditions`. If any condition fails, the effect is skipped.
            *   **Execute Effect:** If conditions pass, retrieves the `TraitEffectFn` (implementation) using `effectInstance.effectId` from `TraitEffectSystem.getTraitEffectImplementation` and executes it with the `TraitEffectContext`.

5.  **Effect Execution (`Systems/TraitEffects/Implementations.ts`):**
    *   The `TraitEffectFn` performs its logic (e.g., modifies unit stats, plays animations, applies statuses, emits further events).

## 5. Key Components & Files

*   **`Models/Traits.ts`:**
    *   Defines core types like `TraitData`, `RelicStateObject`.
    *   Contains the central `processTraitEvent` function responsible for orchestrating the execution of trait effects based on an event.
    *   Provides `run...Traits` functions that are called by event listeners.
*   **`Models/TraitEffectSystem.ts`:**
    *   Manages registries for `TraitDefinition`, `TraitEffectFn`, and `TraitConditionFn`.
    *   Defines types like `TraitDefinition`, `TraitEffectInstanceData`, `TraitEffectContext`.
    *   Provides utility functions: `resolveTargets`, `checkConditions`.
*   **`Models/TraitSystemEventListeners.ts`:**
    *   Connects `GameEvents` to the trait processing logic in `Traits.ts`.
    *   Sets up listeners for unit-specific and global (relic) trait evaluations.
*   **`Models/UnitEvents.ts`:**
    *   Defines the types of unit events (e.g., `onAction`, `onAttackByMe`) and their callback signatures.
    *   Provides `UnitEventKeys` and similar helper types for strong typing of event triggers.
*   **`Models/EventPayloads.ts`:**
    *   Defines the data structures passed with game events, providing context to trait processing.
*   **`Systems/TraitEffects/Implementations.ts`:**
    *   Contains the concrete JavaScript/TypeScript functions that implement the logic for each `effectId`.
    *   Uses Higher-Order Functions like `requireSourceUnit` to enforce context requirements.
*   **`constants/events.ts` (`GameEvents`):**
    *   A centralized list of event strings used throughout the game, including those that trigger traits.

## 6. Extensibility Guide

*   **Adding a new Trait:**
    1.  Define a new `TraitDefinition` object (either in code or a data file).
    2.  Specify its `id`, `name`, `description`, `categories`.
    3.  Populate its `effects` array with `TraitEffectInstanceData`, referencing existing or new `effectId`s, `eventTrigger`s, `targetSelector`s, `conditions`, and any necessary parameters.
    4.  Register the definition using `registerTraitDefinition` (typically via `initializeTraitsFromData`).
    5.  Assign the trait (as `TraitData`) to `Unit.traits` or `Relic.traits`.
*   **Adding a new Effect Implementation:**
    1.  Define a new `TraitEffectFn` in `Systems/TraitEffects/Implementations.ts`.
    2.  This function will receive a `TraitEffectContext`.
    3.  Implement the desired logic.
    4.  Register it with a unique `effectId` using `registerTraitEffectImplementation` within `registerAllTraitEffects`.
*   **Adding a new Condition Type:**
    1.  Define a new `TraitConditionFn` (e.g., in a dedicated conditions file or `TraitEffectSystem.ts`).
    2.  This function will receive a `TraitEffectContext` and `TraitConditionInstanceData`.
    3.  Implement the evaluation logic, returning `true` or `false`.
    4.  Register it with a unique condition type string using `registerTraitConditionImplementation`.
*   **Adding a new Target Selector:**
    1.  Modify the `resolveTargets` function in `TraitEffectSystem.ts` to include a new `case` for your selector string.
    2.  Implement the logic to determine and return the array of target `Unit`s.
    3.  **Note:** Enemy selectors should generally return the closest enemy for consistency, unless implementing guild-wide effects.

## 8. Design Evolution & Removed Features

*   **HP-Based Mechanics (Removed):** The game no longer uses HP systems. The following trait effects and conditions have been removed:
    *   `temporary_hp_boost` - Temporary HP increases
    *   `damage_scales_with_missing_hp` - Berserker rage based on missing HP
    *   `sacrifice_hp_for_damage` - Trading HP for damage
    *   `source_hp_below_percent` condition - HP threshold checks
*   **Alternative Mechanics:** Focus shifted to time-based effects, position strategy, morale management, and action economy:
    *   `damage_scales_with_time` - Growing fury over battle duration
    *   `sacrifice_cooldown_for_damage` - Trading action speed for power
    *   `battle_time_elapsed` condition - Time-based activation
*   **Simplified Targeting:** Enemy targeting simplified to always use closest enemy, while allied targeting retains positional complexity for formation strategy.
*   **Guild-Wide Skills:** All skills now target the entire enemy guild by default, eliminating the need for separate "area damage" mechanics.

## 9. Future Considerations / Potential Improvements

*   **Dynamic Trait Modification:** Allow effects to add/remove/modify traits on units during gameplay.
*   **Stacking/Duration:** Formalize how multiple instances of the same trait or status effects stack or manage durations.
*   **Trait Priorities:** If multiple traits trigger on the same event, define an order of execution.
*   **More Sophisticated Target Selectors:** Implement selectors based on geometry, specific unit properties, etc. (Note: Area effects are now handled at the skill level rather than targeting level.)
*   **Debugging Tools:** Visualizers or loggers specifically for trait activations and effect executions.
*   **Declarative Effect Definitions:** Move toward more data-driven effect composition for designers.
*   **Effect Builder Pattern:** Simplify effect creation with a fluent API for common patterns.
