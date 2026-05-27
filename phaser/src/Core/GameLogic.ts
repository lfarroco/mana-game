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

import { SessionData, ActionPayload } from "@Core/Types";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { registerCollection } from "@Models/Entities/Card";
import { resolveAction } from "./Actions/ActionResolver";

// Re-export core session management
export {
	createInitialSession,
	createDefaultRunStats,
	validateAndApplyTeamUpdate,
} from "./SessionManagement";

// Re-export enemy generation
export { generateEnemyTeamForRound } from "./EnemyGeneration";

// Re-export seeding and randomization
export { stringToSeed, generateNextSeed, getDeterministicRandomOptionIndex } from "./Seeding";

// Re-export option generation
export { generateEncounterOptions, generateShopOptions } from "./OptionGeneration";

// Re-export action resolution
export { resolveAction } from "./Actions/ActionResolver";

// Re-export combat simulation
export { simulateCombat } from "./Combat/CombatSimulation";

// Re-export session transitions and phase logic
export {
	transitionToNextState,
	getCurrentOptions,
	pickOption,
	pickRandomOption,
	pickRandomOptionsUntilGameOver,
	type TransitionToNextStateOptions,
} from "./SessionTransitions";

export {
	createLlmPlayerService,
	type BoardMove,
	type LlmBoardView,
	type LlmCardDetails,
	type LlmChoiceResult,
	type LlmChoicesView,
	type LlmPlayerService,
	type LlmPlayerServiceConfig,
	type LlmStateView,
} from "./LlmPlayerService";

// Re-export replay management
export { replayManifest, buildReplaySnapshot, type ReplayManifestOptions } from "./ReplayManagement";
export { constructCombatState } from "./ReplayManagement";

// Register base collection to ensure unit definitions exist
registerCollection(BASE_COLLECTION_DATA);

/**
 * Process a single turn: resolve action and return updated session without transitioning phase.
 * Kept for backward compatibility; new code should use transitionToNextState directly.
 */
export function processSessionTurn(
	session: SessionData,
	actionId: string,
	payload?: ActionPayload
): { session: SessionData; updates: string[] | undefined; combatResult?: { won: boolean } } {
	const { team, updates } = resolveAction(session, actionId, payload);
	const nextSession = { ...session, team };
	const combatResult = undefined;

	return { session: nextSession, updates, combatResult };
}
