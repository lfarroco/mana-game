/**
 * Combat State Building and Simulation
 *
 * Handles construction of combat state from session data and wrapping
 * the combat simulation loop.
 */

import { SessionData } from "@Core/Types";
import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import * as BoardLogic from "@Models/BoardLogic";
import { makeUnit } from "@Models/Entities/Unit";
import { makeForce } from "@Models/Entities/Force";
import { generateEnemyTeam } from "@Core/Combat/generateEnemyTeam";
import { runCombat } from "@Core/Combat/RunCombatCore";
import { createServerCombatEffects, CombatLogEntry } from "@Core/Combat/ServerCombatEffects";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "@Core/Combat/CombatConstants";
import * as Random from "@Utils/Random";
import { stringToSeed } from "@Core/Seeding";

/**
 * Build a complete combat state from a session.
 * Includes player units, enemy units, board grid, and forces.
 */
export function createCombatState(session: SessionData): State {
	let playerUnits: Unit[] = [];
	if (session.team && session.team.units) {
		playerUnits = JSON.parse(JSON.stringify(session.team.units));
		playerUnits.forEach((u) => {
			u.effects = u.effects || [];
			u.reactions = u.reactions || [];
			u.life = u.maxLife;
		});
	}

	// Ensure player always has a core
	const hasCore = playerUnits.some((u) => u.isCore);
	if (!hasCore) {
		const freeSlot = BoardLogic.findFreeSlot(playerUnits, FORCE_ID_PLAYER, { x: 1, y: 1 });
		if (freeSlot) {
			const crystal = makeUnit(FORCE_ID_PLAYER, "crystal_core", freeSlot);
			crystal.isCore = true;
			playerUnits.push(crystal);
		}
	}

	// Retrieve or generate enemy team
	let enemyUnits: Unit[] = [];
	if (
		session.current_options &&
		typeof session.current_options === "object" &&
		"combatState" in session.current_options &&
		session.current_options.combatState?.enemyTeam
	) {
		enemyUnits = JSON.parse(JSON.stringify(session.current_options.combatState.enemyTeam));
	} else {
		const allCards = Card.getNonCores();
		const mockState: State = {
			battleData: {
				forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)],
				units: [],
				grid: [],
			},
			savedGames: [],
			session: { ...session },
		};
		enemyUnits = generateEnemyTeam(mockState, session.round, allCards);
		enemyUnits.forEach((u) => (u.force = FORCE_ID_CPU));
	}

	return {
		savedGames: [],
		session: {
			...session,
			team: { units: playerUnits },
		},
		battleData: {
			forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)],
			grid: BoardLogic.createGrid(),
			units: [...playerUnits, ...enemyUnits],
		},
	};
}

/**
 * Run a complete combat simulation for a session.
 * Returns final state, initial units snapshot, and combat logs.
 */
export function simulateCombat(session: SessionData): {
	finalState: State;
	initialUnits: Unit[];
	logs: CombatLogEntry[];
} {
	const combatState = createCombatState(session);

	const seedVal = stringToSeed(session.initial_seed);
	Random.setSeed(seedVal);

	// Snapshot initial units for replay
	const initialUnits = JSON.parse(JSON.stringify(combatState.battleData.units));

	const effects = createServerCombatEffects(combatState);
	const combatRunner = runCombat(combatState, effects);

	const SIM_DELTA = 16.67;
	let frame = 0;
	const MAX_FRAMES = 10000;

	// Run the combat loop until resolution or max frames
	while (combatRunner.isActive() && frame < MAX_FRAMES) {
		effects.setFrame(frame);
		combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
		frame++;
	}

	return { finalState: combatState, initialUnits, logs: effects.logs };
}

/**
 * Determine combat outcome from simulation result.
 * Checks for outcome log or falls back to checking if core survived.
 */
export function determineCombatOutcome(
	finalState: State,
	simLogs: CombatLogEntry[]
): { won: boolean } {
	const playerUnits = finalState.battleData.units.filter((u) => u.force === "PLAYER");
	const outcomeLog = simLogs.find((l) => l.type === "outcome");

	if (outcomeLog) {
		return { won: outcomeLog.result === "player_won" };
	}

	const core = playerUnits.find((u) => u.isCore);
	return { won: !!(core && core.life > 0) };
}
