/**
 * Enemy Team Generation
 *
 * Generates enemy teams for given rounds and player win counts.
 */

import { ClientState } from "@Models/ClientState";
import { Unit } from "@game/Models";
import * as Card from "@game/Entities/Card";
import { SessionData } from "@game/Models";
import { makeForce } from "@game/Entities/Force";
import { generateEnemyTeam } from "@Core/Combat/generateEnemyTeam";
import { FORCE_ID_PLAYER, FORCE_ID_CPU } from "@game/Constants";
import { stringToSeed } from "@game/Seeding";
import { getSeed, setSeed } from "@game/Random";

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
	} as ClientState;

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
