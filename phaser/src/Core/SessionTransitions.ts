/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import * as Types from "@Core/Types";
import * as Unit from "@Models/Entities/Unit";
import * as SessionManagement from "./SessionManagement";
import * as CombatSimulation from "./Combat/CombatSimulation";
import * as EnemyGeneration from "./EnemyGeneration";
import * as PhaseConfig from "@Core/PhaseSystem/PhaseConfig";
import * as GameLogic from "@Core/GameLogic";
import * as RecruitmentActions from "@Core/Actions/RecruitmentActions"
import * as OrbAndCoreUpgrades from "@Core/Actions/OrbAndCoreUpgrades"
import * as Logger from "@Utils/Logger";

const logger = Logger.createLogger("SessionTransitions");

export type TransitionToNextStateOptions = {
	combatEnemyTeam?: Unit.Unit[];
	combatEnemyPlayerName?: string;
};

type ActionTransitionHandler = (
	session: Types.SessionData,
	action: Types.Action,
) => Types.SessionData;

// function transitionToNextEncounterStep(
// 	session: Types.SessionData,
// ): Types.SessionData {
// 	const phase = PhaseConfig.getPhaseForTurn(session.round, session.step + 1);

// 	const options = GameLogic.generateEncounterOptions(session);
// 	return {
// 		...session,
// 		phase,
// 		current_options: options,
// 	}
// }

function transitionToNextRoundEncounter(
	session: Types.SessionData,
): Types.SessionData {
	const nextRound = session.round + 1;
	const tempSession = { ...session, round: nextRound, step: 1 };
	const encounterResult = GameLogic.generateEncounterOptions(tempSession);

	return {
		...session,
		phase: "encounter",
		current_options: encounterResult,
		step: 0,
		round: session.round + 1,
	};
}

function transitionAfterCombat(session: Types.SessionData): Types.SessionData {

	if (!session.combatState) {
		throw new Error("Missing combat state on session after combat completion");
	}

	const { wonCombat } = session.combatState;

	if (wonCombat)
		session.wins += 1;
	else
		session.losses += 1;

	if (session.wins >= 10) {
		// TODO: it should be just "victory", the client decides the rest
		return {
			...session,
			phase: "victory",
			current_options: [
				{ id: "victory", label: "Continue Endless" },
				{ id: "return_to_menu", label: "Return to Menu" },
			],
		};
	}

	if (session.losses >= 4) {
		return {
			...session,
			phase: "game_over",
			current_options: [{ id: "return_to_menu", label: "Return to Menu" }],
		};
	}

	const nextStep = session.step + 1;
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

	if (expectedPhase === "upgrade_core") {
		return {
			...session,
			phase: "upgrade_core",
			current_options: [
				{ id: "increase_core_max_life" },
				{ id: "upgrade_core_power" },
				{ id: "decrease_core_cooldown" },
			],
			step: session.step + 1,
		};
	}

	if (expectedPhase === "add_reaction_core") {
		return {
			...session,
			phase: "add_reaction_core",
			current_options: [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			],
			step: session.step + 1,
		};
	}

	return transitionToNextRoundEncounter(session);
}

function transitionAfterVictory(session: Types.SessionData): Types.SessionData {
	if (session.losses >= 4) {
		return {
			...session,
			phase: "game_over",
			current_options: [{ id: "return_to_menu", label: "Return to Menu" }],
		};
	}

	const nextStep = session.step + 1;
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

	if (expectedPhase === "upgrade_core") {
		return {
			...session,
			phase: "upgrade_core",
			current_options: [
				{ id: "increase_core_max_life" },
				{ id: "upgrade_core_power" },
				{ id: "decrease_core_cooldown" },
			],
			step: session.step + 1,
		};
	}

	if (expectedPhase === "add_reaction_core") {
		return {
			...session,
			phase: "add_reaction_core",
			current_options: [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			],
			step: session.step + 1,
		};
	}

	return session;
}

const ACTION_HANDLERS: Record<string, ActionTransitionHandler> = {
	select_encounter: (session, action) => {

		if (
			action.type === "select_encounter"
			&& action.encounterId === "combat_encounter"
		) {

			logger.debug("Entering combat encounter phase. Executing combat...", session);

			const nextSession = executeCombatPhase(session);

			logger.debug("Combat phase completed. Session after combat:", nextSession);

			return nextSession;

		}

		return {
			...session,
			// For now it's ok, but it should depend on the selected encounter
			phase: "shop",
			current_options: GameLogic.generateShopOptions(
				session,
				action,
			).options,
		}
	},
	end_combat: (session) => {

		const session_ = transitionAfterCombat(session);

		return session_;
	},
	// Recruit or upgrade a unit by card ID
	// Pass a session variant that uses the deep-copied team so recruitUnit mutates our copy.
	recruit_unit: (session, action) => {
		mustBeOfType("recruit_unit", action);
		const updatedSession = RecruitmentActions.recruitUnit(
			session,
			action.unitId,
			action.targetSlot,
		);

		return transitionToNextStep(updatedSession);
	},
	update_team: (session, action) => {
		mustBeOfType("update_team", action);

		return SessionManagement.updateTeamAction(
			session,
			action.team.units,
		);
	},
	start_combat: (session, action) => {
		mustBeOfType("start_combat", action);

		return executeCombatPhase(session);
	},
	decrease_core_cooldown: (session) => {

		const { team: { units } } = session;
		const core = units.find((u) => u.isCore);

		if (!core) {
			logger.warn("No core found in team when applying cooldown decrease");
			return session;
		}

		OrbAndCoreUpgrades.decreaseCoresCooldown(core);
		return session;
	},
	upgrade_core_power: (session) => {

		const { team: { units } } = session;
		const core = units.find((u) => u.isCore);

		if (!core) {
			logger.warn("No core found in team when applying power increase");
			return session;
		}

		OrbAndCoreUpgrades.upgradeCorepower(core, session.round);
		return session;

	},
	increase_core_max_life: (session) => {

		const { team: { units } } = session;
		const core = units.find((u) => u.isCore);

		if (!core) {
			logger.warn("No core found in team when applying life increase");
			return session;
		}

		OrbAndCoreUpgrades.upgradeCoreMaxLife(core, session.round);
		return session;

	},
	// Meta actions: team mutation with no phase change.
	// discard_unit: (session) => ({
	// 	nextPhase: session.phase,
	// 	nextOptions: session.current_options,
	// 	stepIncrement: 0,
	// 	roundIncrement: 0,
	// }),
	discard_unit: (session, action) => {
		mustBeOfType("discard_unit", action);

		RecruitmentActions.discardUnit(
			session.team.units,
			action.unitId as string
		);
		return session;
	},

	apply_orb: (session, action) => {
		mustBeOfType("apply_orb", action);
		const { orbId, targetUnitId } = action;
		OrbAndCoreUpgrades.applyOrb(
			session.team.units,
			targetUnitId,
			orbId,
		);
		return session;
	},
	// update_team: (session) => ({
	// 	nextPhase: session.phase,
	// 	nextOptions: session.current_options,
	// 	stepIncrement: 0,
	// 	roundIncrement: 0,
	// }),

	// Encounter special transitions.
	combat_encounter: (session) => {
		// Handle combat execution (side effect)

		logger.debug("Entering combat encounter phase. Executing combat...", session);

		const nextSession = executeCombatPhase(session);

		logger.debug("Combat phase completed. Session after combat:", nextSession);

		return nextSession;
	},
	upgrade_unit: (session) => ({
		...session,
		phase: "orb_shop",
		current_options: [{ id: "upgrade_orb" }],
	}),
	power_distributor: (session) => ({
		...session,
		phase: "orb_shop",
		current_options: [{ id: "distribute_power_orb" }],
	}),
	power_absorber: (session) => ({
		...session,
		phase: "orb_shop",
		current_options: [{ id: "absorb_power_orb" }],
	}),
	// TODO: the below logic is very wrong
	// skip_encounter: (session) => ({
	// 	nextPhase: "shop",
	// 	nextOptions: GameLogic.generateShopOptions(session).options,
	// 	stepIncrement: 0,
	// }),

	// Shop transitions.
	skip: (session) => {
		return transitionToNextEncounterStep(session);
	},
	// Orb shop transitions.
	//apply_orb: (session) => transitionToNextEncounterStep(session),

	// Combat transitions.
	victory: (session) => transitionAfterVictory(session),

	// Upgrade core transitions.
	//increase_core_max_life: (session) => transitionToNextRoundEncounter(session),
	//upgrade_core_power: (session) => transitionToNextRoundEncounter(session),
	//decrease_core_cooldown: (session) => transitionToNextRoundEncounter(session),

	// Add reaction core transitions.
	// on_100_damage_effect: (session) => transitionToNextRoundEncounter(session),
	// on_ally_death_effect: (session) => transitionToNextRoundEncounter(session),
	// on_crit_effect: (session) => transitionToNextRoundEncounter(session),
	// on_battle_start_effect: (session) => transitionToNextRoundEncounter(session),

	// return_to_menu: (session) => ({
	// 	nextPhase: session.phase,
	// 	nextOptions: session.current_options,
	// 	stepIncrement: 0,
	// 	roundIncrement: 0,
	// }),

	//shop: (session) => transitionToNextEncounterStep(session),
};

function transitionToNextStep(
	session: Types.SessionData,
): Types.SessionData {
	const nextPhase = PhaseConfig.getPhaseForTurn(
		session.round,
		session.step + 1,
	);

	if (nextPhase === "encounter") {

		const options = GameLogic.generateEncounterOptions(session);
		session.current_options = options;
		session.phase = nextPhase;
		session.step = session.step + 1;
		return session;

	}

	if (nextPhase === "combat_encounter") {
		session.current_options = [
			{ id: "combat_encounter" }
		];
		session.phase = nextPhase;
		session.step = session.step + 1;
		return session;
	}

	return {
		...session,
		phase: nextPhase,
		current_options: [],
	}
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
	action: Types.Action,
	//options?: TransitionToNextStateOptions
): Types.SessionData {

	logger.debug("Transitioning session with action:", action);

	const nextSession = structuredClone(session);

	const actionHandler = ACTION_HANDLERS[action.type];

	if (!actionHandler)
		throw new Error(`No transition handler for phase '${nextSession.phase}' and action '${action.type}'`);

	return actionHandler(nextSession, action);

}

/**
 * Execute combat phase: simulate, determine outcome, and set up results screen.
 */
function executeCombatPhase(
	session: Types.SessionData,
): Types.SessionData {

	session.phase = "combat";
	// TODO: support multiplayer
	const enemyTeam =
		EnemyGeneration.generateEnemyTeamForRound(
			session.round,
			session.wins,
			session.seed,
		);

	const simulation = CombatSimulation.simulateCombat(
		session,
		enemyTeam,
	);
	const playerUnits = simulation.finalState.battleData.units.filter((u) => u.force === "PLAYER");
	//session.runStats = simulation.finalState.session.runStats || session.runStats;
	//session.team.units = JSON.parse(JSON.stringify(simulation.finalState.session.team.units));

	const { won: wonCombat } = CombatSimulation.determineCombatOutcome(simulation.finalState, simulation.logs);

	const combatState: Types.CombatState = {
		enemyTeam,
		units: simulation.finalState.battleData.units,
		seed: session.seed,
		enemyPlayerName: "CPU",
		wonCombat,
		initialUnits: simulation.initialUnits,
		finalPlayerUnits: playerUnits,
		logs: simulation.logs,
		nextSession: undefined,
	};

	session.combatState = combatState;

	return {
		...session,
		current_options: [{
			id: "end_combat"
		}]
	}

	// const transitionResult = transitionAfterCombat(session);

	// session.phase = transitionResult.phase;
	// session.current_options = transitionResult.current_options;

	// session.step = transitionResult.step;

	// session.round = transitionResult.round;

	// combatState.nextSession = session;

	// return session;
}

function mustBeOfType<T extends Types.Action["type"]>(expectedType: T, action: Types.Action): asserts action is Extract<Types.Action, { type: T }> {
	if (action.type !== expectedType) {
		throw new Error(`Expected action of type ${expectedType}, but got ${action.type}`);
	}
}