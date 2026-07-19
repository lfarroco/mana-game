/**
 * Combat State Building and Simulation
 *
 * Handles construction of combat state from session data and wrapping
 * the combat simulation loop.
 */

import * as Models from "../Models";
import * as RunCombatCore from "./CombatRunner";
import * as CombatLogger from "./CombatLogger";
import * as Random from "../Random";
import * as Seeding from "../Seeding";

const clone = <A>(json: A): A => {
	return JSON.parse(JSON.stringify(json));
}

export function createCombatState(
	session: Models.SessionData,
	enemyTeam: Models.Unit[],
): Models.CombatState {

	return {
		enemyTeam: clone(enemyTeam),
		units: clone(([...session.team.units, ...enemyTeam])),
		logs: [],
		seed: session.seed,
		playerCoreId: session.team.units.find(u => u.isCore)!.id,
		cpuCoreId: enemyTeam.find(u => u.isCore)!.id,
		enemyPlayerName: "CPU",
		wonCombat: false,
		finalPlayerUnits: clone(session.team.units),
		initialUnits: clone([...session.team.units, ...enemyTeam])
	}

}

/**
 * Run a complete combat simulation for a session.
 * Returns final state, initial units snapshot, and combat logs.
 */
export function simulateCombat(
	session: Models.SessionData,
	combatState: Models.CombatState,
): Models.CombatState {

	const seedVal = Seeding.stringToSeed(combatState.seed);
	Random.setSeed(seedVal);

	const combatRunner = RunCombatCore.runCombat(session, combatState);

	const SIM_DELTA = 16.67;
	let frame = 0;
	const MAX_FRAMES = 10000;

	// Run the combat loop until resolution or max frames
	while (combatRunner.isActive() && frame < MAX_FRAMES) {
		combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
		frame++;
	}

	// Extract logs from the combat environment's logger
	const env = combatRunner.getEnv();
	const logs = env.logger.getLogs();

	combatState.logs = logs;

	return combatState;
}


export function determineCombatOutcome(
	simLogs: CombatLogger.CombatLogEntry[]
): boolean {
	const outcomeLog = simLogs.find((l) => l.type === "outcome")!;

	return outcomeLog.result === "player_won" || outcomeLog.result === "both_won";

}