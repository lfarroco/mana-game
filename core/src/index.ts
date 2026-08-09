/**
 * @mana/core — Barrel export.
 *
 * This file re-exports the public API surface of the core package.
 * Consumers should import from this file rather than reaching into
 * internal modules: `import { … } from "@mana/core"` or `import { … } from "@game/index"`.
 *
 * Directory structure:
 *   math/           — Pure math utilities (Random, Geometry, Constants)
 *   board/          — Board logic (slot finding, movement)
 *   Combat/         — Combat simulation (runner, simulation, logger, systems, stats)
 *   Entities/       — Entity definitions & factories (Card, Unit, Force)
 *   session/        — Session management (creation, transitions, option generation, enemies)
 *   TriggerSystem/  — Trigger system & effects
 *   Actions/        — Action handlers (recruitment, orb upgrades)
 *   Orbs/           — Orb definitions & constants
 *   data/           — Game data (BaseCollection)
 *   PhaseSystem/    — Phase configuration
 *   types/          — Domain type definitions (card, combat, effect, unit, session, action, player, server)
 */

// ---------------------------------------------------------------------------
// Functional primitives
// ---------------------------------------------------------------------------
export * as Functional from "./Functional";

// ---------------------------------------------------------------------------
// Types (re-exports everything from Models.ts compat shim)
// ---------------------------------------------------------------------------
export type * from "./Models";
export * from "./Models"; // also exports runtime values (GLOBAL_REACTIONS, BASIC_ABILITIES)

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------
export * as Random from "./math/Random";
export * as Geometry from "./math/Geometry";
export * as Constants from "./math/Constants";

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------
export * as BoardLogic from "./board/BoardLogic";

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
export * as Card from "./Entities/Card";
export * as Unit from "./Entities/Unit";
export * as Force from "./Entities/Force";

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------
export * as CombatSimulation from "./Combat/CombatSimulation";
export * as CombatRunner from "./Combat/CombatRunner";
export * as CombatLogger from "./Combat/CombatLogger";
export * as CombatCodec from "./Combat/CombatCodec";
export * as CombatStateIndexes from "./Combat/CombatStateIndexes";
export * as CombatStatsTracker from "./Combat/CombatStatsTracker";
export * as PoisonDamageSystem from "./Combat/PoisonDamageSystem";
export * as RegenSystem from "./Combat/RegenSystem";
export * as TimeoutDamageSystem from "./Combat/TimeoutDamageSystem";
export * as StatusEffectSystem from "./Combat/StatusEffectSystem";
export * as generateEnemyTeam from "./Combat/generateEnemyTeam";

// ---------------------------------------------------------------------------
// Trigger system
// ---------------------------------------------------------------------------
export * as TriggerSystem from "./TriggerSystem/TriggerSystem";
export * as Effects from "./TriggerSystem/effects/index";

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export * as SessionManagement from "./session/SessionManagement";
export * as SessionTransitions from "./session/SessionTransitions";
export * as OptionGeneration from "./session/OptionGeneration";
export * as EnemyGeneration from "./session/EnemyGeneration";

// ---------------------------------------------------------------------------
// Phase system
// ---------------------------------------------------------------------------
export * as PhaseConfig from "./PhaseSystem/PhaseConfig";

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export * as RecruitmentActions from "./Actions/RecruitmentActions";
export * as OrbAndCoreUpgrades from "./Actions/OrbAndCoreUpgrades";

// ---------------------------------------------------------------------------
// Orbs
// ---------------------------------------------------------------------------
export * as OrbConstants from "./Orbs/OrbConstants";
export * as OrbDefinitions from "./Orbs/OrbDefinitions";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
export * as BaseCollection from "./data/BaseCollection";
export * as EffectBuilders from "./data/effectBuilders";

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------
export * as Event from "./Event";
