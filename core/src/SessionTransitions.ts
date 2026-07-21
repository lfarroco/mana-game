/**
 * Session State Transitions
 *
 * Handles advancing a session through game phases and managing turn progression.
 * Orchestrates action resolution, seed advancement, and phase transitions.
 */

import * as Models from "./Models";
import * as SessionManagement from "./SessionManagement";
import * as CombatSimulation from "./Combat/CombatSimulation";
import * as EnemyGeneration from "./EnemyGeneration";
import * as PhaseConfig from "./PhaseSystem/PhaseConfig";
import * as RecruitmentActions from "./Actions/RecruitmentActions"
import * as OrbAndCoreUpgrades from "./Actions/OrbAndCoreUpgrades"
	;
import * as OptionGeneration from "./OptionGeneration";


const ORB_SHOP_ENCOUNTER_OPTIONS: Record<string, Models.PhaseOption[]> = {
	upgrade_unit: [{ id: "upgrade_orb" }],
	power_distributor: [{ id: "distribute_power_orb" }],
	power_absorber: [{ id: "absorb_power_orb" }],
};

/**
 * Stores the most recent combat result so it can be consumed by
 * the end_combat transition without being embedded in SessionData.
 */
let pendingCombatState: Models.CombatState | null = null;

function transitionAfterCombat(session: Models.SessionData): Models.SessionData {

	if (!pendingCombatState) {
		throw new Error("Missing combat state for end_combat transition");
	}

	const { wonCombat } = pendingCombatState;
	pendingCombatState = null;

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

	const encounterResult = OptionGeneration.createEncounterOptions(session);

	return {
		...session,
		phase: "encounter",
		options: encounterResult,
		step: 0,
		round: session.round + 1,
	};
}

function transitionAfterVictory(session: Models.SessionData): Models.SessionData {

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
	session: Models.SessionData,
	action: Models.Action,
) => Models.SessionData> = {
	select_encounter: (session, action) => {

		if (action.type !== "select_encounter") throw new Error();

		if (action.encounterId === "start_combat")
			return executeCombatPhase(session);

		const orbOptions = ORB_SHOP_ENCOUNTER_OPTIONS[action.encounterId];
		if (orbOptions) {
			return {
				...session,
				phase: "orb_shop",
				options: orbOptions,
			};
		}

		return {
			...session,
			phase: "shop",
			options: OptionGeneration.generateShopOptions(
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
			console.warn("SessionTransitions", "No core found in team when applying cooldown decrease");
			return session;
		}

		OrbAndCoreUpgrades.decreaseCoresCooldown(core);
		return session;
	},
	upgrade_core_power: (session) => {

		const { team: { units } } = session;
		const core = units.find((u) => u.isCore);

		if (!core) {
			console.warn("SessionTransitions", "No core found in team when applying power increase");
			return session;
		}

		OrbAndCoreUpgrades.upgradeCorepower(core, session.round);
		return session;

	},
	increase_core_max_life: (session) => {

		const { team: { units } } = session;
		const core = units.find((u) => u.isCore);

		if (!core) {
			console.warn("SessionTransitions", "No core found in team when applying life increase");
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
			{ seed: session.seed },
		);
		return transitionToNextStep(session);
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

	// 	console.debug("SessionTransitions", "Entering combat phase. Executing combat...", session);

	// 	const nextSession = executeCombatPhase(session);

	// 	console.debug("SessionTransitions", "Combat phase completed. Session after combat:", nextSession);

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
		const allowedSkipPhases: Models.PhaseType[] = [
			"encounter",
			"shop",
			"orb_shop",
			"upgrade_core",
			"add_reaction_core"
		];

		if (!allowedSkipPhases.includes(session.phase)) {
			console.warn("SessionTransitions", `Received skip action in phase '${session.phase}', which is not allowed. Ignoring action.`);
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
	session: Models.SessionData,
): Models.SessionData {
	const nextPhase = PhaseConfig.getPhaseForTurn(
		session.round,
		session.step + 1,
	);

	if (nextPhase === "encounter") {

		const options = OptionGeneration.createEncounterOptions(session);
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
	session: Models.SessionData,
	action: Models.Action,
): Models.ActionResponse {

	console.debug("SessionTransitions", "Transitioning session with action:", action);

	const nextSession = structuredClone(session);

	const actionHandler = ACTION_HANDLERS[action.type];

	if (!actionHandler)
		throw new Error(`No transition handler for phase '${nextSession.phase}' and action '${action.type}'`);

	const resultSession = actionHandler(nextSession, action);

	// If a combat was just executed (start_combat), carry the combatState in the response
	const combatState = pendingCombatState;
	// For start_combat, the handler calls executeCombatPhase which sets pendingCombatState.
	// For any other action, pendingCombatState will be null (or stale from a previous combat).
	// Only attach it when the session phase is "combat" (meaning a combat just started).
	if (resultSession.phase === "combat" && combatState) {
		return { session: resultSession, combatState };
	}

	return { session: resultSession };

}

function executeCombatPhase(
	session: Models.SessionData,
): Models.SessionData {

	console.debug("SessionTransitions", "Entering combat encounter phase. Executing combat...", session);

	// TODO: support multiplayer
	const enemyTeam =
		EnemyGeneration.generateEnemyTeamForRound(
			session.round,
			session.wins,
			session.seed,
		);

	const combatState: Models.CombatState = CombatSimulation.createCombatState(session, enemyTeam);

	const finalCombatState = CombatSimulation.simulateCombat(
		session,
		combatState
	);

	//const playerUnits = simulation.finalState.battleData.units.filter((u) => u.force === "PLAYER");
	//session.runStats = simulation.finalState.session.runStats || session.runStats;
	//session.team.units = JSON.parse(JSON.stringify(simulation.finalState.session.team.units));

	pendingCombatState = finalCombatState;

	const nextSession: Models.SessionData = {
		...session,
		phase: "combat",
		options: [{
			id: "end_combat"
		}],
	};

	console.debug("SessionTransitions", "Combat phase completed. Session after combat:", nextSession);

	return nextSession;

}