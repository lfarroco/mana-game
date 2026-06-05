/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import * as Types from "@Core/Types";
import * as Unit from "@Models/Entities/Unit";
import * as ActionResolver from "./Actions/ActionResolver";
import * as Seeding from "./Seeding";
import * as SessionManagement from "./SessionManagement";
import * as CombatSimulation from "./Combat/CombatSimulation";
import * as EnemyGeneration from "./EnemyGeneration";
import * as PhaseConfig from "@Core/PhaseSystem/PhaseConfig";
import * as GameLogic from "@Core/GameLogic";

export type TransitionToNextStateOptions = {
	combatEnemyTeam?: Unit.Unit[];
	combatEnemyPlayerName?: string;
};

type TransitionResult = {
	nextPhase: Types.PhaseType;
	nextOptions: Types.PhaseOption[];
	stepIncrement?: number;
	roundIncrement?: number;
};

type ActionTransitionHandler = (session: Types.SessionData, actionId: string) => TransitionResult;

function transitionToNextEncounterStep(session: Types.SessionData): TransitionResult {
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, session.step + 1);

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

function transitionToNextRoundEncounter(session: Types.SessionData): TransitionResult {
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

function transitionAfterCombat(session: Types.SessionData): TransitionResult {
	if (session.wins >= 10) {
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
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

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

function transitionAfterVictory(session: Types.SessionData): TransitionResult {
	if (session.losses >= 4) {
		return {
			nextPhase: "game_over",
			nextOptions: [{ id: "return_to_menu", label: "Return to Menu" }],
		};
	}

	const nextStep = session.step + 1;
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

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
		nextOptions: session.current_options,
		stepIncrement: 0,
		roundIncrement: 0,
	}),
	update_team: (session) => ({
		nextPhase: session.phase,
		nextOptions: session.current_options,
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
	skip: (session) => {
		switch (session.phase) {
			case "encounter":
				return {
					nextPhase: "shop",
					nextOptions: GameLogic.generateShopOptions(session).options,
					stepIncrement: 0,
				};
			case "shop":
				return transitionToNextEncounterStep(session);
			default:
				return {
					nextPhase: session.phase,
					nextOptions: session.current_options,
					stepIncrement: 0,
					roundIncrement: 0,
				};
		}
	},
	skip_shop: (session) => transitionToNextEncounterStep(session),

	// Orb shop transitions.
	apply_orb: (session) => transitionToNextEncounterStep(session),

	// Combat transitions.
	victory: (session) => transitionAfterVictory(session),

	// Upgrade core transitions.
	increase_core_max_life: (session) => transitionToNextRoundEncounter(session),
	upgrade_core_power: (session) => transitionToNextRoundEncounter(session),
	decrease_core_cooldown: (session) => transitionToNextRoundEncounter(session),

	// Add reaction core transitions.
	on_100_damage_effect: (session) => transitionToNextRoundEncounter(session),
	on_ally_death_effect: (session) => transitionToNextRoundEncounter(session),
	on_crit_effect: (session) => transitionToNextRoundEncounter(session),
	on_battle_start_effect: (session) => transitionToNextRoundEncounter(session),

	// End-state/no-op action.
	return_to_menu: (session) => ({
		nextPhase: session.phase,
		nextOptions: session.current_options,
		stepIncrement: 0,
		roundIncrement: 0,
	}),
};

const PHASE_FALLBACK_HANDLERS: Partial<Record<Types.PhaseType, ActionTransitionHandler>> = {
	encounter: (session, actionId) => ({
		nextPhase: "shop",
		nextOptions: GameLogic.generateShopOptions(session, actionId).options,
		stepIncrement: 0,
	}),
	shop: (session) => transitionToNextEncounterStep(session),
};

function computeTransition(session: Types.SessionData, actionId: string): TransitionResult {
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
	session: Types.SessionData,
	actionId: string,
	payload?: Types.ActionPayload,
	options?: TransitionToNextStateOptions
): { session: Types.SessionData; combatResult?: { won: boolean }; combatState?: Types.CombatState } {
	const nextSession: Types.SessionData = JSON.parse(JSON.stringify(session)); // Deep copy
	nextSession.runStats = nextSession.runStats || SessionManagement.createDefaultRunStats();

	// Handle exclusions for resolving action (pure transitions that don't modify team)
	const isPureTransition = false;

	if (!isPureTransition) {
		const { team } = ActionResolver.resolveAction(nextSession, actionId, payload);
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
		nextSession.seed = Seeding.generateNextSeed(nextSession.seed, actionId);
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
	let combatState: Types.CombatState | undefined = undefined;

	if (nextSession.phase === "combat") {
		const combatOutcome = executeCombatPhase(nextSession, options);
		combatResult = combatOutcome.combatResult;
		combatState = combatOutcome.combatState;
	}

	if (combatState) {
		nextSession.combatState = JSON.parse(JSON.stringify(combatState));
	} else {
		delete nextSession.combatState;
	}

	nextSession.updated_at = new Date();
	return { session: nextSession, combatResult, combatState };
}

/**
 * Execute combat phase: simulate, determine outcome, and set up results screen.
 */
function executeCombatPhase(
	session: Types.SessionData,
	options?: TransitionToNextStateOptions
): { combatResult: { won: boolean }; combatState: Types.CombatState } {
	const enemyTeam = options?.combatEnemyTeam
		? JSON.parse(JSON.stringify(options.combatEnemyTeam))
		: EnemyGeneration.generateEnemyTeamForRound(session.round, session.wins, session.seed);

	const combatSession: Types.SessionData = {
		...session,
	};

	const simResult = CombatSimulation.simulateCombat(combatSession, enemyTeam);
	const playerUnits = simResult.finalState.battleData.units.filter((u) => u.force === "PLAYER");
	session.runStats = simResult.finalState.session.runStats || session.runStats;
	session.team.units = JSON.parse(JSON.stringify(simResult.finalState.session.team.units));

	const { won: wonCombat } = CombatSimulation.determineCombatOutcome(simResult.finalState, simResult.logs);
	const postCombatSession = JSON.parse(JSON.stringify(session)) as Types.SessionData;
	postCombatSession.wins += wonCombat ? 1 : 0;
	postCombatSession.losses += wonCombat ? 0 : 1;

	const combatState: Types.CombatState = {
		enemyTeam,
		units: simResult.finalState.battleData.units,
		seed: session.seed,
		enemyPlayerName: options?.combatEnemyPlayerName,
		wonCombat,
		initialUnits: simResult.initialUnits,
		finalPlayerUnits: playerUnits,
		logs: simResult.logs,
		nextSession: undefined,
	};

	const transitionResult = transitionAfterCombat(postCombatSession);
	const nextSession = JSON.parse(JSON.stringify(postCombatSession)) as Types.SessionData;
	nextSession.phase = transitionResult.nextPhase;
	nextSession.current_options = transitionResult.nextOptions;
	if (transitionResult.stepIncrement) {
		nextSession.step += transitionResult.stepIncrement;
	}
	if (transitionResult.roundIncrement) {
		nextSession.round += transitionResult.roundIncrement;
	}
	delete nextSession.combatState;
	combatState.nextSession = nextSession;

	return { combatResult: { won: wonCombat }, combatState };
}

/**
 * Resolve a numeric or string selection to an actual option.
 */
function resolveSelectedOption(session: Types.SessionData, selection: number | string) {

	const options = session.current_options;

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
	session: Types.SessionData,
	selection: number | string,
	payload?: Types.ActionPayload,
	options?: TransitionToNextStateOptions
): Types.SessionData {
	const option = resolveSelectedOption(session, selection);
	return transitionToNextState(session, option.id, payload, options).session;
}

/**
 * Randomly pick an available option and transition (deterministic based on seed).
 */
export function pickRandomOption(
	session: Types.SessionData,
	payload?: Types.ActionPayload,
	options?: TransitionToNextStateOptions
): Types.SessionData {
	const currentOptions = session.current_options;
	if (currentOptions.length === 0) {
		return session;
	}

	const optionIndex = Seeding.getDeterministicRandomOptionIndex(
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
	session: Types.SessionData,
	config?: {
		maxActions?: number;
		transitionOptionsForAction?: (
			currentSession: Types.SessionData,
			actionId: string,
			index: number
		) => TransitionToNextStateOptions | undefined;
	}
): Types.SessionData {
	const maxActions = config?.maxActions ?? 128;
	let currentSession = session;

	for (let index = 0; index < maxActions; index++) {
		if (currentSession.phase === "victory" || currentSession.phase === "game_over") {
			break;
		}

		const currentOptions = currentSession.current_options;
		if (currentOptions.length === 0) {
			break;
		}

		const optionIndex = Seeding.getDeterministicRandomOptionIndex(
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
