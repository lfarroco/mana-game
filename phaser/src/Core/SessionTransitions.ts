/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import { SessionData, ActionPayload, CombatState, PhaseOption, PhaseType } from "@Core/Types";
import { Unit } from "@Models/Entities/Unit";
import { resolveAction } from "./Actions/ActionResolver";
import { generateNextSeed, getDeterministicRandomOptionIndex } from "./Seeding";
import { createDefaultRunStats } from "./SessionManagement";
import { simulateCombat, determineCombatOutcome } from "./Combat/CombatSimulation";
import { generateEnemyTeamForRound } from "./EnemyGeneration";
import { getPhaseForTurn } from "@Core/PhaseSystem/PhaseConfig";
import * as GameLogic from "@Core/GameLogic";

export type TransitionToNextStateOptions = {
	combatEnemyTeam?: Unit[];
	combatEnemyPlayerName?: string;
};

type TransitionResult = {
	nextPhase: PhaseType;
	nextOptions: PhaseOption[];
	stepIncrement?: number;
	roundIncrement?: number;
};

type ActionTransitionHandler = (session: SessionData, actionId: string) => TransitionResult;

function getCurrentPhaseOptions(session: SessionData): PhaseOption[] {
	return session.current_options;
}

function transitionToNextEncounterStep(session: SessionData): TransitionResult {
	const expectedPhase = getPhaseForTurn(session.round, session.step + 1);

	if (expectedPhase === "combat") {
		return {
			nextPhase: "encounter",
			nextOptions: [{ id: "combat_encounter" }],
			stepIncrement: 1,
		};
	}

	const encounterOptions = GameLogic.generateEncounterOptions(session);
	return {
		nextPhase: "encounter",
		nextOptions: encounterOptions,
		stepIncrement: 1,
	};
}

function transitionToNextRoundEncounter(session: SessionData): TransitionResult {
	const nextRound = session.round + 1;
	const tempSession = { ...session, round: nextRound, step: 1 };
	const encounterResult = GameLogic.generateEncounterOptions(tempSession);

	return {
		nextPhase: "encounter",
		nextOptions: encounterResult,
		stepIncrement: 1 - session.step,
		roundIncrement: 1,
	};
}

function transitionFromCombat(session: SessionData, actionId: string): TransitionResult {
	if (actionId !== "combat_done" && actionId !== "victory") {
		throw new Error(`Unexpected action ${actionId} in Combat transition`);
	}

	if (actionId === "combat_done" && session.wins >= 10) {
		return {
			nextPhase: "victory",
			nextOptions: [
				{ id: "victory", label: "Continue Endless" },
				{ id: "return_to_menu", label: "Return to Menu" },
			],
		};
	}

	if (session.losses >= 4) {
		return {
			nextPhase: "game_over",
			nextOptions: [{ id: "return_to_menu", label: "Return to Menu" }],
		};
	}

	const nextStep = session.step + 1;
	const expectedPhase = getPhaseForTurn(session.round, nextStep);

	if (expectedPhase === "upgrade_core") {
		return {
			nextPhase: "upgrade_core",
			nextOptions: [
				{ id: "increase_core_max_life" },
				{ id: "upgrade_core_power" },
				{ id: "decrease_core_cooldown" },
			],
			stepIncrement: 1,
		};
	}

	if (expectedPhase === "add_reaction_core") {
		return {
			nextPhase: "add_reaction_core",
			nextOptions: [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			],
			stepIncrement: 1,
		};
	}

	return transitionToNextRoundEncounter(session);
}

const ACTION_HANDLERS: Record<string, ActionTransitionHandler> = {
	// Meta actions: team mutation with no phase change.
	discard_unit: (session) => ({
		nextPhase: session.phase,
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
		roundIncrement: 0,
	}),
	update_team: (session) => ({
		nextPhase: session.phase,
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
		roundIncrement: 0,
	}),

	// Encounter special transitions.
	combat_encounter: () => ({
		nextPhase: "combat",
		nextOptions: [],
	}),
	upgrade_unit: () => ({
		nextPhase: "orb_shop",
		nextOptions: [{ id: "upgrade_orb" }],
		stepIncrement: 0,
	}),
	power_distributor: () => ({
		nextPhase: "orb_shop",
		nextOptions: [{ id: "distribute_power_orb" }],
		stepIncrement: 0,
	}),
	power_absorber: () => ({
		nextPhase: "orb_shop",
		nextOptions: [{ id: "absorb_power_orb" }],
		stepIncrement: 0,
	}),
	skip_encounter: (session) => ({
		nextPhase: "shop",
		nextOptions: GameLogic.generateShopOptions(session).options,
		stepIncrement: 0,
	}),

	// Shop transitions.
	skip_shop: (session) => transitionToNextEncounterStep(session),

	// Orb shop transitions.
	apply_orb: (session) => ({
		nextPhase: "orb_shop",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	orb_shop_done: (session) => transitionToNextEncounterStep(session),

	// Combat transitions.
	combat_done: (session, actionId) => transitionFromCombat(session, actionId),
	victory: (session, actionId) => transitionFromCombat(session, actionId),

	// Upgrade core transitions.
	increase_core_max_life: (session) => ({
		nextPhase: "upgrade_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	upgrade_core_power: (session) => ({
		nextPhase: "upgrade_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	decrease_core_cooldown: (session) => ({
		nextPhase: "upgrade_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	upgrade_core_done: (session) => transitionToNextRoundEncounter(session),

	// Add reaction core transitions.
	on_100_damage_effect: (session) => ({
		nextPhase: "add_reaction_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	on_ally_death_effect: (session) => ({
		nextPhase: "add_reaction_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	on_crit_effect: (session) => ({
		nextPhase: "add_reaction_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	on_battle_start_effect: (session) => ({
		nextPhase: "add_reaction_core",
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
	}),
	add_reaction_core_done: (session) => transitionToNextRoundEncounter(session),

	// End-state/no-op action.
	return_to_menu: (session) => ({
		nextPhase: session.phase,
		nextOptions: getCurrentPhaseOptions(session),
		stepIncrement: 0,
		roundIncrement: 0,
	}),
};

const PHASE_FALLBACK_HANDLERS: Partial<Record<PhaseType, ActionTransitionHandler>> = {
	encounter: (session, actionId) => ({
		nextPhase: "shop",
		nextOptions: GameLogic.generateShopOptions(session, actionId).options,
		stepIncrement: 0,
	}),
	shop: (session) => transitionToNextEncounterStep(session),
};

function computeTransition(session: SessionData, actionId: string): TransitionResult {
	const actionHandler = ACTION_HANDLERS[actionId];
	if (actionHandler) {
		return actionHandler(session, actionId);
	}

	const fallbackHandler = PHASE_FALLBACK_HANDLERS[session.phase];
	if (fallbackHandler) {
		return fallbackHandler(session, actionId);
	}

	throw new Error(`No transition handler for phase '${session.phase}' and action '${actionId}'`);
}

/**
 * Transition a session to the next phase based on a player action.
 *
 * Steps:
 * 1. Resolve the action (modify team/units)
 * 2. Advance the seed
 * 3. Determine next phase and options via actionId dispatch
 * 4. Execute combat if entering combat phase
 * 5. Return updated session with new phase state
 */
export function transitionToNextState(
	session: SessionData,
	actionId: string,
	payload?: ActionPayload,
	options?: TransitionToNextStateOptions
): { session: SessionData; combatResult?: { won: boolean }; combatState?: CombatState } {
	const nextSession: SessionData = JSON.parse(JSON.stringify(session)); // Deep copy
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

	const transitionResult = computeTransition(nextSession, actionId);

	// Apply transition results
	nextSession.phase = transitionResult.nextPhase;
	nextSession.current_options = transitionResult.nextOptions;

	if (transitionResult.stepIncrement) {
		nextSession.step += transitionResult.stepIncrement;
	}
	if (transitionResult.roundIncrement) {
		nextSession.round += transitionResult.roundIncrement;
	}

	// Handle combat execution (side effect)
	let combatResult = undefined;
	let combatState: CombatState | undefined = undefined;

	if (nextSession.phase === "combat") {
		const combatOutcome = executeCombatPhase(nextSession, options);
		combatResult = combatOutcome.combatResult;
		combatState = combatOutcome.combatState;
		nextSession.combatState = combatState;
	} else {
		nextSession.combatState = undefined;
	}

	nextSession.updated_at = new Date();
	return { session: nextSession, combatResult, combatState };
}

/**
 * Execute combat phase: simulate, determine outcome, and set up results screen.
 */
function executeCombatPhase(
	session: SessionData,
	options?: TransitionToNextStateOptions
): { combatResult: { won: boolean }; combatState: CombatState } {
	const enemyTeam = options?.combatEnemyTeam
		? JSON.parse(JSON.stringify(options.combatEnemyTeam))
		: generateEnemyTeamForRound(session.round, session.wins, session.seed);

	const combatSession: SessionData = {
		...session,
		combatState: {
			enemyTeam,
			logs: [],
			seed: session.seed,
			units: session.team.units,
		},
	};

	const simResult = simulateCombat(combatSession);
	const playerUnits = simResult.finalState.battleData.units.filter((u) => u.force === "PLAYER");
	session.runStats = simResult.finalState.session.runStats || session.runStats;
	session.team.units = JSON.parse(JSON.stringify(simResult.finalState.session.team.units));

	const { won: wonCombat } = determineCombatOutcome(simResult.finalState, simResult.logs);

	session.wins += wonCombat ? 1 : 0;
	session.losses += wonCombat ? 0 : 1;

	const combatState: CombatState = {
		enemyTeam,
		units: simResult.finalState.battleData.units,
		seed: session.seed,
		enemyPlayerName: options?.combatEnemyPlayerName,
		wonCombat,
		initialUnits: simResult.initialUnits,
		finalPlayerUnits: playerUnits,
		logs: simResult.logs,
	};

	const continueOptions: PhaseOption[] = [{ id: "combat_done", label: "Continue" }];
	session.current_options = continueOptions;
	session.combatState = combatState;

	return { combatResult: { won: wonCombat }, combatState };
}

/**
 * Get the current available options for the session.
 */
export function getCurrentOptions(session: SessionData) {
	return getCurrentPhaseOptions(session);
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
