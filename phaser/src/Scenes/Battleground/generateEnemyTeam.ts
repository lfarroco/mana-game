import { CardDefinition } from "../../Models/Entities/Card";
import { cpuForce } from "../../Models/Entities/Force";
import { vec2 } from "../../Models/Geometry";
import { makeUnit } from "../../Models/Entities/Unit";
import { pickOne } from "../../utils";
import { getState } from "../../Models/State";

const BASE_ENEMY_COUNT = 2;
const MIN_ENEMY_COUNT = 2; // Minimum number of enemies, regardless of low prestige
const MAX_ENEMY_COUNT = 5; // Maximum number of enemies
const ROUND_DIFFICULTY_CONTRIBUTION = 0.5; // e.g., 0.5 points per round
const PRESTIGE_DIFFICULTY_CONTRIBUTION = 0.25; // e.g., 0.25 points per prestige point

/**
 * Calculates the enemy team size based on the current round and player prestige.
 * @param round The current game round.
 * @param playerPrestige The player's current prestige level.
 * @returns The calculated number of enemies for the upcoming battle.
 */
const calculateEnemyTeamSize = (round: number, playerPrestige: number): number => {
	const additionalUnitPoints =
		(round * ROUND_DIFFICULTY_CONTRIBUTION) +
		(playerPrestige * PRESTIGE_DIFFICULTY_CONTRIBUTION);

	// Calculate how many additional units can be afforded based on the points.
	// Math.floor ensures we only add whole units.
	const numberOfAdditionalUnits = Math.floor(additionalUnitPoints);

	// Determine the desired team size before applying constraints.
	const desiredTeamSize = BASE_ENEMY_COUNT + numberOfAdditionalUnits;

	// Clamp the team size to be within the defined MIN_ENEMY_COUNT and MAX_ENEMY_COUNT.
	const finalTeamSize = Math.max(MIN_ENEMY_COUNT, Math.min(MAX_ENEMY_COUNT, desiredTeamSize));

	// For future use: These are fractional points not enough for a full unit,
	// could be used for enemy buffs, relics, etc.
	// const spareDifficultyPoints = additionalUnitPoints - numberOfAdditionalUnits;

	return finalTeamSize;
};

/**
 * Generates an enemy team based on the current round and a pool of available card definitions.
 * The size of the team is determined by `calculateEnemyTeamSize`.
 * A formation template is chosen based on the team size, and units are picked from the pool
 * to fill the roles specified in the template (tank, ranged, melee, support).
 * @param round The current game round, used for difficulty calculation.
 * @param pool An array of `CardDefinition` objects from which enemy units will be selected.
 * @returns An array of `Unit` objects representing the generated enemy team.
 */
export function generateEnemyTeam(round: number, pool: CardDefinition[]) {
	// t = tank
	// r = ranged dps
	// s = support
	// m = melee dps
	const templates: { [hour: number]: string[][]; } = {
		2: [
			// Example Formations for 2 enemies:
			// .r.  (One ranged unit in the back-middle)
			// ...
			// .m.  (One melee unit in the front-middle)
			[
				".r.",
				"...",
				".m."
			],
			[
				"...",
				"...",
				"m.m"
			], // Two melee units in the front corners
			[
				"r.r",
				"...",
				"...",
			] // Two ranged units in the back corners
			// ... (other templates for size 2)
		],
		3: [
			[
				"...",
				"...",
				"mmm"
			],
			// ... (other templates for size 3)
			["r.r", ".r.", "..."],
			["...", ".t.", "m.m"], // Example with a tank
			["r.r", "...", ".s."], // Example with support
			[
				"...",
				".r.",
				"m.m"
			]
		],
		4: [
			[
				"r.r",
				"...",
				"m.m"
			],
			[
				"rrr",
				"...",
				".m."
			]
		],
		5: [
			[
				"r.m",
				"..m",
				"r.m"
			],
			[
				"r.m",
				"r..",
				"r.m"
			]
		]
	};

	const playerPrestige = getState().gameData.player.prestige;
	const enemyTeamSize = calculateEnemyTeamSize(round, playerPrestige);

	const availableTemplates = templates[enemyTeamSize];
	if (!availableTemplates || availableTemplates.length === 0) {
		console.warn(`No templates available for enemy team size: ${enemyTeamSize}. Defaulting to empty team.`);
		return [];
	}
	const template = pickOne(availableTemplates);

	const parsed = template.map(row => row.split(""));

	// Helper functions to filter the card pool by role-defining traits.
	// These ensure that if a specific role is requested, we try to pick a card with that trait.
	const getRanged = () => pool.filter(c => c.traits.some(t => t.id === "ranged"));
	const getMelee = () => pool.filter(c => c.traits.some(t => t.id === "melee"));
	const getSupport = () => pool.filter(c => c.traits.some(t => t.id === "support"));
	const getTank = () => pool.filter(c => c.traits.some(t => t.id === "taunt"));

	const units = [];

	for (let y = 0; y < parsed.length; y++) {
		const row = parsed[y];
		for (let x = 0; x < row.length; x++) {
			const char = row[x];
			let card: CardDefinition | undefined;
			let potentialCards: CardDefinition[] = [];

			switch (char) {
				case "r":
					potentialCards = getRanged();
					if (potentialCards.length > 0) {
						card = pickOne(potentialCards);
					} else {
						console.warn(`No 'ranged' cards available in the pool for template. Skipping unit at (${x},${y}).`);
					}
					break;
				case "m":
					potentialCards = getMelee();
					if (potentialCards.length > 0) {
						card = pickOne(potentialCards);
					} else {
						console.warn(`No 'melee' cards available in the pool for template. Skipping unit at (${x},${y}).`);
					}
					break;
				case "s":
					potentialCards = getSupport();
					if (potentialCards.length > 0) {
						card = pickOne(potentialCards);
					} else {
						console.warn(`No 'support' cards available in the pool for template. Skipping unit at (${x},${y}).`);
					}
					break;
				case "t":
					potentialCards = getTank();
					if (potentialCards.length > 0) {
						card = pickOne(potentialCards);
					} else {
						console.warn(`No 'taunt' (tank) cards available in the pool for template. Skipping unit at (${x},${y}).`);
					}
					break;
				default:
					break;
			}
			if (card !== undefined) {

				const unit = makeUnit(cpuForce.id, card.id, vec2(x, y));
				units.push(unit);
			}
		}
	}

	return units;
}
