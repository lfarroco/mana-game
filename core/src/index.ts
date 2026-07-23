/**
 * @mana/core — Barrel export.
 *
 * This file re-exports the public API surface of the core package.
 * Consumers should import from this file rather than reaching into
 * internal modules: `import { … } from "@mana/core"` or `import { … } from "@game/index"`.
 */

// ---------------------------------------------------------------------------
// Functional primitives
// ---------------------------------------------------------------------------
export * as Functional from "./Functional";

// ---------------------------------------------------------------------------
// Models (types only — zero runtime cost)
// ---------------------------------------------------------------------------
export type * from "./Models";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export * as Constants from "./Constants";

// ---------------------------------------------------------------------------
// Core systems
// ---------------------------------------------------------------------------
export * as Random from "./Random";
export * as Geometry from "./Geometry";
export * as BoardLogic from "./BoardLogic";
export * as Event from "./Event";

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
export * as CombatStatsTracker from "./Combat/CombatStatsTracker";
export * as PoisonDamageSystem from "./Combat/PoisonDamageSystem";
export * as RegenSystem from "./Combat/RegenSystem";
export * as TimeoutDamageSystem from "./Combat/TimeoutDamageSystem";
export * as StatusEffectSystem from "./Combat/StatusEffectSystem";

// ---------------------------------------------------------------------------
// Trigger system
// ---------------------------------------------------------------------------
export * as TriggerSystem from "./TriggerSystem/TriggerSystem";
export * as Effects from "./TriggerSystem/effects/index";

// ---------------------------------------------------------------------------
// Game logic
// ---------------------------------------------------------------------------
export * as SessionManagement from "./SessionManagement";
export * as SessionTransitions from "./SessionTransitions";
export * as PhaseConfig from "./PhaseSystem/PhaseConfig";
export * as OptionGeneration from "./OptionGeneration";
export * as EnemyGeneration from "./EnemyGeneration";
export * as GenerateEnemyTeam from "./Combat/generateEnemyTeam";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
export * as BaseCollection from "./BaseCollection";
export * as OrbConstants from "./Orbs/OrbConstants";
export * as OrbDefinitions from "./Orbs/OrbDefinitions";