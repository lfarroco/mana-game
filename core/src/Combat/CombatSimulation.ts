/**
 * Combat State Building and Simulation
 *
 * Handles construction of combat state from session data and wrapping
 * the combat simulation loop.
 */

import * as Models from "../Models";
import * as CombatRunner from "./CombatRunner";
import * as CombatLogger from "./CombatLogger";

export function createCombatState(
	session: Models.SessionData,
	enemyTeam: Models.Unit[],
): Models.CombatState {

	const units: Models.Unit[] = structuredClone([...session.team.units, ...enemyTeam]);
	const unitById = new Map(units.map(u => [u.id, u]));
	const playerCore = units.find(u => u.isCore && u.force === session.team.units[0]?.force)!;
	const cpuCore = units.find(u => u.isCore && u.force !== session.team.units[0]?.force)!;

	return {
		units,
		logs: [],
		enemyPlayerName: "CPU",
		wonCombat: false,
		finalPlayerUnits: structuredClone(session.team.units),
		initialUnits: structuredClone(units),
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

	const combatRunner = CombatRunner.runCombat(session, combatState);

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

	// Sort logs by timeMs to ensure proper playback ordering
	// (deferred events and timeout damage log entries with future timestamps)
	logs.sort((a, b) => a.timeMs - b.timeMs);

	// Ensure outcome entry is always last regardless of timestamp
	const outcomeIndex = logs.findIndex((l) => l.type === "outcome");
	if (outcomeIndex !== -1 && outcomeIndex < logs.length - 1) {
		const outcome = logs.splice(outcomeIndex, 1)[0];
		logs.push(outcome);
	}

	// Derive wonCombat from the outcome log entry.
	// This must happen after the outcome entry has been reordered to last position
	// so that determineCombatOutcome can reliably find it.
	combatState.wonCombat = determineCombatOutcome(logs);

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
	const outcomeLog = simLogs.find((l) => l.type === "outcome");

	if (!outcomeLog) {
		console.warn(
			"CombatSimulation",
			"determineCombatOutcome: no outcome log entry found (MAX_FRAMES reached?). Defaulting to loss.",
		);
		return false;
	}

	return outcomeLog.result === "player_won" || outcomeLog.result === "both_won";

}