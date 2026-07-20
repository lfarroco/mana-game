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

	const units = clone([...session.team.units, ...enemyTeam]);
	const unitById = new Map(units.map(u => [u.id, u]));
	const playerCore = units.find(u => u.isCore && u.force === session.team.units[0]?.force)!;
	const cpuCore = units.find(u => u.isCore && u.force !== session.team.units[0]?.force)!;

	return {
		units,
		logs: [],
		enemyPlayerName: "CPU",
		wonCombat: false,
		finalPlayerUnits: clone(session.team.units),
		initialUnits: clone([...session.team.units, ...enemyTeam]),
		unitById,
		playerCore,
		cpuCore,
		playerUnits: units.filter(u => u.force === playerCore.force),
		cpuUnits: units.filter(u => u.force === cpuCore.force),
	};

}

/**
 * Run a complete combat simulation for a session.
 * Returns final state, initial units snapshot, and combat logs.
 */
export function simulateCombat(
	session: Models.SessionData,
	combatState: Models.CombatState,
): Models.CombatState {

	const seedVal = Seeding.stringToSeed(session.seed);
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

	// Propagate the advanced seed back to the session so subsequent
	// combats and out-of-combat random operations continue from where
	// the RNG left off (env.seed was advanced by pickRandom calls during combat).
	session.seed = env.seed;

	combatState.logs = logs;

	return combatState;
}


export function determineCombatOutcome(
	simLogs: CombatLogger.CombatLogEntry[]
): boolean {
	const outcomeLog = simLogs.find((l) => l.type === "outcome")!;

	return outcomeLog.result === "player_won" || outcomeLog.result === "both_won";

}