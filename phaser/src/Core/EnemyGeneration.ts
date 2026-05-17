/**
 * Enemy Team Generation
 *
 * Generates enemy teams for given rounds and player win counts.
 */

import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import * as Card from "@Models/Entities/Card";
import { SessionData } from "@Core/Types";
import { makeForce } from "@Models/Entities/Force";
import { generateEnemyTeam } from "@Core/Combat/generateEnemyTeam";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "@Core/Combat/CombatConstants";
import { stringToSeed } from "@Core/Seeding";
import { getSeed, setSeed } from "@Utils/Random";

/**
 * Generate the enemy team for a specific round and win count.
 * CPU team has access to all non-core units regardless of unlock status.
 */
export function generateEnemyTeamForRound(round: number, wins: number, seed?: string): Unit[] {
	const allCards = Card.getNonCores();
	const mockState = {
		battleData: {
			forces: [makeForce(FORCE_ID_PLAYER), makeForce(FORCE_ID_CPU)],
			units: [],
			grid: [],
		},
		savedGames: [],
		session: {
			wins,
			player_id: FORCE_ID_PLAYER,
		} as SessionData,
	} as State;

	const previousSeed = getSeed();
	if (seed) {
		setSeed(stringToSeed(`${seed}:enemy:${round}:${wins}`));
	}

	const units = generateEnemyTeam(mockState, round, allCards);
	if (seed) {
		setSeed(previousSeed);
	}

	// Explicitly assign to CPU force to ensure correctness regardless of mock state nuances
	units.forEach((u) => (u.force = FORCE_ID_CPU));
	return units;
}
