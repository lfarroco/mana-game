/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import { SessionData, ActionPayload, CombatState } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { phaseManager } from "@Core/PhaseSystem";
import { resolveAction } from "./Actions/ActionResolver";
import { generateNextSeed, getDeterministicRandomOptionIndex } from "./Seeding";
import { createDefaultRunStats } from "./SessionManagement";
import { simulateCombat, determineCombatOutcome } from "./Combat/CombatSimulation";
import { generateEnemyTeamForRound } from "./EnemyGeneration";

export type TransitionToNextStateOptions = {
	combatEnemyTeam?: Unit[];
};

/**
 * Transition a session to the next phase based on a player action.
 *
 * Steps:
 * 1. Resolve the action (modify team/units)
 * 2. Advance the seed
 * 3. Use PhaseManager to determine next phase and options
 * 4. Execute combat if entering combat phase
 * 5. Return updated session with new phase state
 */
export function transitionToNextState(
	session: SessionData,
	actionId: string,
	payload?: ActionPayload,
	options?: TransitionToNextStateOptions
): { session: SessionData; combatResult?: { won: boolean } } {
	const nextSession = JSON.parse(JSON.stringify(session)); // Deep copy
	nextSession.runStats = nextSession.runStats || createDefaultRunStats();

	// Handle exclusions for resolving action (pure transitions that don't modify team)
	const isPureTransition =
		(nextSession.phase === "orb_shop" && actionId === "orb_shop_done") ||
		(nextSession.phase === "upgrade_core" && actionId === "upgrade_core_done") ||
		(nextSession.phase === "add_reaction_core" && actionId === "add_reaction_core_done");

	if (!isPureTransition) {
		const { team } = resolveAction(nextSession, actionId, payload);
		nextSession.team = team;

		const actionEntry = {
			round: nextSession.round,
			phase: nextSession.phase,
			step: nextSession.step,
			actionId,
			payload,
		};
		nextSession.action_log = [...(nextSession.action_log || []), actionEntry];
	}

	// Generate new seed — board repositioning does not advance the run seed
	// because update_team never appears in the deferred-submission action log.
	if (actionId !== "update_team") {
		nextSession.seed = generateNextSeed(nextSession.seed, actionId);
	}

	// Use PhaseManager for transition logic
	const transitionResult = phaseManager.transition({
		session: nextSession,
		actionId,
		payload,
	});

	// Apply transition results
	nextSession.phase = transitionResult.nextPhase;
	nextSession.current_options = transitionResult.nextOptions
		? { options: transitionResult.nextOptions }
		: null;

	if (transitionResult.stepIncrement) {
		nextSession.step += transitionResult.stepIncrement;
	}
	if (transitionResult.roundIncrement) {
		nextSession.round += transitionResult.roundIncrement;
	}

	// Handle combat execution (side effect)
	let combatResult = undefined;

	if (nextSession.phase === "combat") {
		combatResult = executeCombatPhase(nextSession, options);
	}

	nextSession.updated_at = new Date();
	return { session: nextSession, combatResult };
}

/**
 * Execute combat phase: simulate, determine outcome, and set up results screen.
 */
function executeCombatPhase(
	session: SessionData,
	options?: TransitionToNextStateOptions
): { won: boolean } {
	const enemyTeam = options?.combatEnemyTeam
		? JSON.parse(JSON.stringify(options.combatEnemyTeam))
		: generateEnemyTeamForRound(session.round, session.wins);

	const simResult = simulateCombat(session);
	const playerUnits = simResult.finalState.battleData.units.filter((u) => u.force === "PLAYER");
	session.runStats = simResult.finalState.session.runStats || session.runStats;

	const { won: wonCombat } = determineCombatOutcome(simResult.finalState, simResult.logs);

	session.wins += wonCombat ? 1 : 0;
	session.losses += wonCombat ? 0 : 1;

	const combatState: CombatState = {
		enemyTeam,
		units: simResult.finalState.battleData.units,
		seed: session.seed,
		wonCombat,
		initialUnits: simResult.initialUnits,
		finalPlayerUnits: playerUnits,
		logs: simResult.logs,
	};

	const continueOptions = [{ id: "combat_done", label: "Continue" }];
	session.current_options = { options: continueOptions, combatState };

	return { won: wonCombat };
}

/**
 * Get the current available options for the session.
 */
export function getCurrentOptions(session: SessionData) {
	if (!session.current_options) {
		return [];
	}

	if (Array.isArray(session.current_options)) {
		return session.current_options;
	}

	return session.current_options.options;
}

/**
 * Resolve a numeric or string selection to an actual option.
 */
function resolveSelectedOption(session: SessionData, selection: number | string) {
	const options = getCurrentOptions(session);

	if (typeof selection === "number") {
		const option = options[selection - 1];
		if (!option) {
			throw new Error(`Option index ${selection} is out of range for ${options.length} options`);
		}
		return option;
	}

	const option = options.find((currentOption) => currentOption.id === selection);
	if (!option) {
		throw new Error(`Option ${selection} is not available in the current session state`);
	}

	return option;
}

/**
 * Pick a specific option (by index or ID) and transition.
 */
export function pickOption(
	session: SessionData,
	selection: number | string,
	payload?: ActionPayload,
	options?: TransitionToNextStateOptions
): SessionData {
	const option = resolveSelectedOption(session, selection);
	return transitionToNextState(session, option.id, payload, options).session;
}

/**
 * Randomly pick an available option and transition (deterministic based on seed).
 */
export function pickRandomOption(
	session: SessionData,
	payload?: ActionPayload,
	options?: TransitionToNextStateOptions
): SessionData {
	const currentOptions = getCurrentOptions(session);
	if (currentOptions.length === 0) {
		return session;
	}

	const optionIndex = getDeterministicRandomOptionIndex(
		session.seed,
		session.round,
		session.step,
		currentOptions.length
	);
	return pickOption(session, optionIndex + 1, payload, options);
}

/**
 * Run the game to completion with random option selection.
 * Useful for testing and AI play-through.
 */
export function pickRandomOptionsUntilGameOver(
	session: SessionData,
	config?: {
		maxActions?: number;
		transitionOptionsForAction?: (
			currentSession: SessionData,
			actionId: string,
			index: number
		) => TransitionToNextStateOptions | undefined;
	}
): SessionData {
	const maxActions = config?.maxActions ?? 128;
	let currentSession = session;

	for (let index = 0; index < maxActions; index++) {
		if (currentSession.phase === "victory" || currentSession.phase === "game_over") {
			break;
		}

		const currentOptions = getCurrentOptions(currentSession);
		if (currentOptions.length === 0) {
			break;
		}

		const optionIndex = getDeterministicRandomOptionIndex(
			currentSession.seed,
			currentSession.round,
			currentSession.step,
			currentOptions.length
		);
		const selectedOption = currentOptions[optionIndex];
		currentSession = pickOption(
			currentSession,
			selectedOption.id,
			undefined,
			config?.transitionOptionsForAction?.(currentSession, selectedOption.id, index)
		);
	}

	return currentSession;
}
