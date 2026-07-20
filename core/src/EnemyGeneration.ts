/**
 * Enemy Team Generation
 *
 * Generates enemy teams for given rounds and player win counts.
 * Uses deterministic seeded RNG so the same seed always produces the same team.
 */

import { Unit } from "./Models";
import * as Card from "./Entities/Card";
import { generateEnemyTeam } from "./Combat/generateEnemyTeam";
import { FORCE_ID_CPU } from "./Constants";

/**
 * Generate the enemy team for a specific round and win count.
 * CPU team has access to all non-core units regardless of unlock status.
 */
export function generateEnemyTeamForRound(round: number, wins: number, seed: string): Unit[] {
	const allCards = Card.getNonCores();

	const units = generateEnemyTeam(seed, wins, round, allCards);
	// Explicitly assign to CPU force to ensure correctness
	units.forEach((u) => (u.force = FORCE_ID_CPU));
	return units;
}
