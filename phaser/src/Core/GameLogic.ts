/**
 * Game Logic Orchestrator
 *
 * Central re-export module for all game logic functionality.
 * This file delegates to specialized modules handling:
 *   - Session management (initialization, updates, validation)
 *   - Option generation (encounters, shops)
 *   - Action resolution (recruitment, orbs, core upgrades)
 *   - Combat simulation
 *   - Session transitions and phase management
 *   - Replay functionality
 *
 * All functions are re-exported here for backward compatibility.
 * New code should import directly from specialized modules.
 */

import * as BaseCollection from "@Data/BaseCollection";
import * as Card from "@Models/Entities/Card";

// Re-export core session management
export {
	createInitialSession,
	createDefaultRunStats,
	updateTeamAction as validateAndApplyTeamUpdate,
} from "./SessionManagement";

// Re-export enemy generation
export { generateEnemyTeamForRound } from "./EnemyGeneration";

// Re-export seeding and randomization
export { stringToSeed, generateNextSeed, getDeterministicRandomOptionIndex } from "./Seeding";

// Re-export option generation
export { createEncounterOptions as generateEncounterOptions, generateShopOptions } from "./OptionGeneration";

// Re-export combat simulation
export { simulateCombat } from "./Combat/CombatSimulation";

// Re-export session transitions and phase logic
export {
	transitionToNextState,
	type TransitionToNextStateOptions,
} from "./SessionTransitions";

// Re-export replay management
export { replayManifest, buildReplaySnapshot, type ReplayManifestOptions } from "./ReplayManagement";
export { constructCombatState } from "./ReplayManagement";

// Register base collection to ensure unit definitions exist
Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);


