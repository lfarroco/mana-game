/**
 * Combat State Building and Simulation
 *
 * Handles construction of combat state from session data and wrapping
 * the combat simulation loop.
 */

import * as Models from "@Core/Models";
import * as State from "@Models/State";
import * as Unit from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import * as BoardLogic from "@Models/BoardLogic";
import * as Force from "@Models/Entities/Force";
import * as generateEnemyTeam from "@Core/Combat/generateEnemyTeam";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as ServerCombatEffects from "@Core/Combat/ServerCombatEffects";
import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as Random from "@Utils/Random";
import { stringToSeed } from "@Core/Seeding";

const cloneValue = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};

/**
 * Build a complete combat state from a session.
 * Includes player units, enemy units, board grid, and forces.
 */
export function createCombatState(session: Models.SessionData, enemyTeam?: Unit.Unit[]): State.State {
	let playerUnits: Unit.Unit[] = [];
	if (session.team && session.team.units) {
		playerUnits = JSON.parse(JSON.stringify(session.team.units));
		playerUnits.forEach((u) => {
			u.effects = u.effects || [];
			u.reactions = u.reactions || [];
			Unit.resetUnitStats(u);
		});
	}

	// Ensure player always has a core
	const hasCore = playerUnits.some((u) => u.isCore);
	if (!hasCore) {
		const freeSlot = BoardLogic.findFreeSlot(playerUnits, CombatConstants.FORCE_ID_PLAYER, [1, 1]);
		if (freeSlot) {
			const crystal = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "crystal_core", freeSlot);
			crystal.isCore = true;
			playerUnits.push(crystal);
		}
	}

	// Retrieve or generate enemy team
	let enemyUnits: Unit.Unit[] = [];
	if (enemyTeam) {
		enemyUnits = JSON.parse(JSON.stringify(enemyTeam));
		enemyUnits.forEach(Unit.resetUnitStats);
	} else {
		const allCards = Card.getNonCores();
		const mockState: State.State = {
			battleData: {
				forces: [Force.makeForce(CombatConstants.FORCE_ID_PLAYER), Force.makeForce(CombatConstants.FORCE_ID_CPU)],
				units: [],
				grid: [],
			},
			savedGames: [],
			session: { ...session },
		};
		enemyUnits = generateEnemyTeam.generateEnemyTeam(mockState, session.round, allCards);
		enemyUnits.forEach((u) => (u.force = CombatConstants.FORCE_ID_CPU));
	}

	return {
		savedGames: [],
		session: {
			...session,
			team: { units: playerUnits },
		},
		battleData: {
			forces: [Force.makeForce(CombatConstants.FORCE_ID_PLAYER), Force.makeForce(CombatConstants.FORCE_ID_CPU)],
			grid: BoardLogic.createGrid(),
			units: [...playerUnits, ...enemyUnits],
		},
	};
}

/**
 * Run a complete combat simulation for a session.
 * Returns final state, initial units snapshot, and combat logs.
 */
export function simulateCombat(session: Models.SessionData, enemyTeam?: Unit.Unit[]): {
	finalState: State.State;
	initialUnits: Unit.Unit[];
	logs: CombatLogger.CombatLogEntry[];
	playerWon: boolean;
} {
	const combatState = createCombatState(session, enemyTeam);

	const seedVal = stringToSeed(session.initial_seed);
	Random.setSeed(seedVal);

	// Snapshot initial units for replay
	const initialUnits = JSON.parse(JSON.stringify(combatState.battleData.units));

	const effects = ServerCombatEffects.createServerCombatEffects(combatState);
	const combatRunner = RunCombatCore.runCombat(combatState, effects);

	const SIM_DELTA = 16.67;
	let frame = 0;
	const MAX_FRAMES = 10000;

	// Run the combat loop until resolution or max frames
	while (combatRunner.isActive() && frame < MAX_FRAMES) {
		effects.setFrame(frame);
		combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
		frame++;
	}

	const persistedTeamUnits = combatState.session.team.units.map((unit) => {
		const persistentUnit = cloneValue(unit);
		Unit.resetUnitStats(persistentUnit);
		return persistentUnit;
	});

	combatState.session = {
		...combatState.session,
		team: { units: persistedTeamUnits },
	};

	return {
		finalState: combatState,
		initialUnits,
		logs: effects.logs,
		playerWon: determineCombatOutcome(effects.logs),
	};
}


export function determineCombatOutcome(
	simLogs: CombatLogger.CombatLogEntry[]
): boolean {
	const outcomeLog = simLogs.find((l) => l.type === "outcome")!;

	return outcomeLog.result === "player_won" || outcomeLog.result === "both_won";

}
