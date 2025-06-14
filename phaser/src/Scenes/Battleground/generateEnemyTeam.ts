import { CardDefinition } from "../../Models/Entities/Card";
import { cpuForce } from "../../Models/Entities/Force";
import { vec2 } from "../../Models/Geometry";
import { makeUnit } from "../../Models/Entities/Unit";
import { pickOne } from "../../utils";
import { getState } from "../../Models/State";

/** Constants for team size and difficulty calculation */
const BASE_ENEMY_COUNT = 2;
const MIN_ENEMY_COUNT = 2; // Minimum number of enemies, regardless of low prestige
const MAX_ENEMY_COUNT = 5; // Maximum number of enemies
const ROUND_DIFFICULTY_CONTRIBUTION = 0.5; // e.g., 0.5 points per round
const PRESTIGE_DIFFICULTY_CONTRIBUTION = 0.25; // e.g., 0.25 points per prestige point

/** Unit role types in formation templates */
export enum UnitRole {
	Tank = 't',
	Ranged = 'r',
	Support = 's',
	Melee = 'm',
	Empty = '.'
}

/** Import formation templates and types */
import { FORMATION_TEMPLATES, FormationTemplate } from './formations';

/** Constants for formation validation */
const FORMATION_WIDTH = 3;
const FORMATION_HEIGHT = 3;
const VALID_ROLES = new Set(Object.values(UnitRole));

/**
 * Validates a formation template.
 * @throws {Error} If template is invalid
 */
const validateFormation = (template: FormationTemplate, teamSize: number): boolean => {
	let unitCount = 0;
	const pattern = template.pattern;

	// Check dimensions
	if (pattern.length !== FORMATION_HEIGHT) {
		throw new Error(`Formation "${template.metadata.name}" must have exactly ${FORMATION_HEIGHT} rows`);
	}

	// Check each row
	for (const row of pattern) {
		if (row.length !== FORMATION_WIDTH) {
			throw new Error(`Formation "${template.metadata.name}" must have exactly ${FORMATION_WIDTH} positions per row`);
		}

		// Count units and validate characters
		for (const char of row) {
			if (!VALID_ROLES.has(char as UnitRole)) {
				throw new Error(`Formation "${template.metadata.name}" has invalid role character: ${char}`);
			}
			if (char !== UnitRole.Empty) {
				unitCount++;
			}
		}
	}

	// Verify unit count
	if (unitCount !== teamSize) {
		throw new Error(`Formation "${template.metadata.name}" must contain exactly ${teamSize} units, found ${unitCount}`);
	}

	return true;
};

/** Trait IDs corresponding to unit roles */
const ROLE_TRAITS: Record<UnitRole, string> = {
	[UnitRole.Tank]: 'taunt',
	[UnitRole.Ranged]: 'ranged',
	[UnitRole.Support]: 'support',
	[UnitRole.Melee]: 'melee',
	[UnitRole.Empty]: ''
};

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
 * 
 * @param round The current game round, used for difficulty calculation.
 * @param pool An array of CardDefinition objects from which enemy units will be selected.
 * @throws {Error} If round is negative or pool is empty
 * @returns An array of Unit objects representing the generated enemy team.
 */
export function generateEnemyTeam(round: number, pool: CardDefinition[]) {
	if (round < 0) {
		throw new Error('Round must be a non-negative number');
	}
	if (pool.length === 0) {
		throw new Error('Card pool cannot be empty');
	}

	const playerPrestige = getState().gameData.player.prestige;
	const enemyTeamSize = calculateEnemyTeamSize(round, playerPrestige);

	// Get formations for the current team size
	const availableTemplates = FORMATION_TEMPLATES[enemyTeamSize];
	if (!availableTemplates?.length) {
		console.warn(`No formations available for team size: ${enemyTeamSize}. Defaulting to empty team.`);
		return [];
	}

	// Filter formations based on current round
	const validTemplates = availableTemplates.filter(template =>
		!template.metadata.minRound || template.metadata.minRound <= round
	);

	if (!validTemplates.length) {
		console.warn(`No formations available for round ${round}. Defaulting to empty team.`);
		return [];
	}

	// Validate chosen formation
	const template = pickOne(validTemplates);
	try {
		validateFormation(template, enemyTeamSize);
	} catch (error) {
		console.error(error);
		return [];
	}

	const parsed = template.pattern.map(row => row.split(""));

	if (!parsed.length || !parsed[0].length) {
		console.warn('Invalid formation template dimensions');
		return [];
	}

	const units = [];
	const getCardsByTrait = (traitId: string): CardDefinition[] =>
		pool.filter(card => card.traits.some(trait => trait.id === traitId));

	for (let y = 0; y < parsed.length; y++) {
		for (let x = 0; x < parsed[y].length; x++) {
			const role = parsed[y][x] as UnitRole;
			if (role === UnitRole.Empty) continue;

			const traitId = ROLE_TRAITS[role];
			if (!traitId) continue;

			const potentialCards = getCardsByTrait(traitId);
			if (!potentialCards.length) {
				console.warn(`No '${traitId}' cards available in the pool for template. Skipping unit at (${x},${y}).`);
				continue;
			}

			const card = pickOne(potentialCards);
			const unit = makeUnit(cpuForce.id, card.id, vec2(x, y));
			units.push(unit);
		}
	}

	return units;
}
