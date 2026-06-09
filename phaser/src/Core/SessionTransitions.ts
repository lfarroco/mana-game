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

// @deprecated deleteme
export type TransitionToNextStateOptions = {
	combatEnemyTeam?: Unit.Unit[];
	combatEnemyPlayerName?: string;
};

function transitionAfterCombat(session: Types.SessionData): Types.SessionData {

	if (!session.combatState) {
		throw new Error("Missing combat state on session after combat completion");
	}

	const { wonCombat } = session.combatState;

	session.combatState = undefined;

	if (wonCombat)
		session.wins += 1;
	else
		session.losses += 1;

	if (session.wins >= 10) {
		// TODO: it should be just "victory", the client decides the rest
		return {
			...session,
			phase: "victory",
			options: [
				{ id: "victory" },
			],
		};
	}

	if (session.losses >= 4) {
		return {
			...session,
			phase: "game_over",
			options: [],
		};
	}

	const nextStep = session.step + 1;
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

	if (expectedPhase === "upgrade_core") {
		return {
			...session,
			phase: "upgrade_core",
			options: [
				{ id: "increase_core_max_life" },
				{ id: "upgrade_core_power" },
				{ id: "decrease_core_cooldown" },
			],
			step: nextStep,
		};
	}

	if (expectedPhase === "add_reaction_core") {
		return {
			...session,
			phase: "add_reaction_core",
			options: [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			],
			step: nextStep,
		};
	}

	const encounterResult = GameLogic.generateEncounterOptions(session);

	return {
		...session,
		phase: "encounter",
		options: encounterResult,
		step: 0,
		round: session.round + 1,
	};
}

function transitionAfterVictory(session: Types.SessionData): Types.SessionData {

	const nextStep = session.step + 1;
	const expectedPhase = PhaseConfig.getPhaseForTurn(session.round, nextStep);

	if (expectedPhase === "upgrade_core") {
		return {
			...session,
			phase: "upgrade_core",
			options: [
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
			options: [
				{ id: "on_100_damage_effect" },
				{ id: "on_crit_effect" },
				{ id: "on_battle_start_effect" },
			],
			step: session.step + 1,
		};
	}

	return session;
}

const ACTION_HANDLERS: Record<string, (
	session: Types.SessionData,
	action: Types.Action,
) => Types.SessionData> = {
	select_encounter: (session, action) => {

		if (action.type !== "select_encounter") throw new Error();

		if (action.encounterId === "start_combat")
			return executeCombatPhase(session);

		return {
			...session,
			// For now it's ok, but it should depend on the selected encounter
			phase: "shop",
			options: GameLogic.generateShopOptions(
				session,
				action,
			),
		}
	},
	end_combat: transitionAfterCombat,
	// Recruit or upgrade a unit by card ID
	// Pass a session variant that uses the deep-copied team so recruitUnit mutates our copy.
	recruit_unit: (session, action) => {
		if (action.type !== "recruit_unit") throw new Error();
		const updatedSession = RecruitmentActions.recruitUnit(
			session,
			action.unitId,
			action.targetSlot,
		);

		return transitionToNextStep(updatedSession);
	},
	update_team: (session, action) => {
		if (action.type !== "update_team") throw new Error();

		return SessionManagement.updateTeamAction(
			session,
			action.team.units,
		);
	},
	start_combat: (session, action) => {
		if (action.type !== "start_combat") throw new Error();

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
		if (action.type !== "discard_unit") throw new Error();

		RecruitmentActions.discardUnit(
			session.team.units,
			action.unitId as string
		);
		return session;
	},

	apply_orb: (session, action) => {
		if (action.type !== "apply_orb") throw new Error();

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
	// start_combat: (session) => {
	// 	// Handle combat execution (side effect)

	// 	logger.debug("Entering combat phase. Executing combat...", session);

	// 	const nextSession = executeCombatPhase(session);

	// 	logger.debug("Combat phase completed. Session after combat:", nextSession);

	// 	return nextSession;
	// },
	upgrade_unit: (session) => ({
		...session,
		phase: "orb_shop",
		options: [{ id: "upgrade_orb" }],
	}),
	power_distributor: (session) => ({
		...session,
		phase: "orb_shop",
		options: [{ id: "distribute_power_orb" }],
	}),
	power_absorber: (session) => ({
		...session,
		phase: "orb_shop",
		options: [{ id: "absorb_power_orb" }],
	}),
	skip: (session) => {
		const allowedSkipPhases: Types.PhaseType[] = [
			"encounter",
			"shop",
			"orb_shop",
			"upgrade_core",
			"add_reaction_core"
		];

		if (!allowedSkipPhases.includes(session.phase)) {
			logger.warn(`Received skip action in phase '${session.phase}', which is not allowed. Ignoring action.`);
			return session;
		}

		return transitionToNextStep(session);
	},
	// Orb shop transitions.
	//apply_orb: (session) => transitionToNextEncounterStep(session),

	// Combat transitions.
	victory: transitionAfterVictory,

	// Upgrade core transitions.
	//increase_core_max_life: (session) => transitionToNextRoundEncounter(session),
	//upgrade_core_power: (session) => transitionToNextRoundEncounter(session),
	//decrease_core_cooldown: (session) => transitionToNextRoundEncounter(session),

	// Add reaction core transitions.
	// on_100_damage_effect: (session) => transitionToNextRoundEncounter(session),
	// on_ally_death_effect: (session) => transitionToNextRoundEncounter(session),
	// on_crit_effect: (session) => transitionToNextRoundEncounter(session),
	// on_battle_start_effect: (session) => transitionToNextRoundEncounter(session),

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
		session.options = options;
		session.phase = nextPhase;
		session.step = session.step + 1;
		return session;

	}

	if (nextPhase === "pre_combat") {
		session.options = [
			{ id: "start_combat" }
		];
		session.phase = nextPhase;
		session.step = session.step + 1;
		return session;
	}

	return {
		...session,
		step: session.step + 1,
		phase: nextPhase,
		options: [],
	}
}


export function transitionToNextState(
	session: Types.SessionData,
	action: Types.Action,
): Types.SessionData {

	logger.debug("Transitioning session with action:", action);

	const nextSession = structuredClone(session);

	const actionHandler = ACTION_HANDLERS[action.type];

	if (!actionHandler)
		throw new Error(`No transition handler for phase '${nextSession.phase}' and action '${action.type}'`);

	return actionHandler(nextSession, action);

}

function executeCombatPhase(
	session: Types.SessionData,
): Types.SessionData {

	logger.debug("Entering combat encounter phase. Executing combat...", session);

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

	const combatState: Types.CombatState = {
		enemyTeam,
		units: simulation.finalState.battleData.units,
		seed: session.seed,
		enemyPlayerName: "CPU",
		wonCombat: simulation.playerWon,
		initialUnits: simulation.initialUnits,
		finalPlayerUnits: playerUnits,
		logs: simulation.logs,
	};

	const nextSession: Types.SessionData = {
		...session,
		phase: "combat",
		options: [{
			id: "end_combat"
		}],
		combatState: combatState
	};

	logger.debug("Combat phase completed. Session after combat:", nextSession);

	return nextSession;

}
