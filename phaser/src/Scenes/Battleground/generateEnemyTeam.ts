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
const WIN_STREAK_DIFFICULTY_BONUS = 0.15; // Extra points per win in a streak
const LOSS_STREAK_DIFFICULTY_REDUCTION = 0.20; // Points reduced per loss in a streak
const MAX_STREAK_EFFECT_POINTS = 2.0; // Max points added/subtracted due to streaks


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

export enum DifficultyTier {
	Challenger = 'Challenger', // Prestige 0-9
	Veteran = 'Veteran',     // Prestige 10-19
	Elite = 'Elite'          // Prestige 20+
}

interface EnemyTeamParameters {
	teamSize: number;
	powerBudgetOverflow: number; // Points left after determining team size, for buffs/upgrades
	difficultyTier: DifficultyTier;
}

/**
 * Calculates enemy team parameters based on round, prestige, and win/loss streaks.
 * @param round The current game round.
 * @param playerPrestige The player's current prestige level.
 * @param winStreak Current player win streak.
 * @param lossStreak Current player loss streak.
 * @returns Parameters for generating the enemy team.
 */
const calculateEnemyTeamParameters = (
	round: number,
	playerPrestige: number,
	winStreak: number,
	lossStreak: number
): EnemyTeamParameters => {
	let difficultyTier: DifficultyTier;
	if (playerPrestige < 10) difficultyTier = DifficultyTier.Challenger;
	else if (playerPrestige < 20) difficultyTier = DifficultyTier.Veteran;
	else difficultyTier = DifficultyTier.Elite;

	let difficultyPoints =
		(round * ROUND_DIFFICULTY_CONTRIBUTION) +
		(playerPrestige * PRESTIGE_DIFFICULTY_CONTRIBUTION);

	// Apply streak modifiers
	difficultyPoints += Math.min(winStreak * WIN_STREAK_DIFFICULTY_BONUS, MAX_STREAK_EFFECT_POINTS);
	difficultyPoints -= Math.min(lossStreak * LOSS_STREAK_DIFFICULTY_REDUCTION, MAX_STREAK_EFFECT_POINTS);
	difficultyPoints = Math.max(0, difficultyPoints); // Ensure points don't go negative

	// Calculate how many additional units can be afforded based on the points.
	// Math.floor ensures we only add whole units.
	const numberOfAdditionalUnits = Math.floor(difficultyPoints);

	// Determine the desired team size before applying constraints.
	const desiredTeamSize = BASE_ENEMY_COUNT + numberOfAdditionalUnits;

	// Clamp the team size to be within the defined MIN_ENEMY_COUNT and MAX_ENEMY_COUNT.
	const teamSize = Math.max(MIN_ENEMY_COUNT, Math.min(MAX_ENEMY_COUNT, desiredTeamSize));

	// Fractional points not enough for a full unit, can be used for enemy buffs etc.
	const powerBudgetOverflow = difficultyPoints - numberOfAdditionalUnits;

	return { teamSize, powerBudgetOverflow, difficultyTier };
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

	const playerState = getState().gameData.player;
	const { teamSize: enemyTeamSize, powerBudgetOverflow, difficultyTier } = calculateEnemyTeamParameters(
		round,
		playerState.prestige,
		playerState.winStreak,
		playerState.lossStreak
	);

	console.log(`Generating enemy team for Round ${round}, Prestige ${playerState.prestige}, Tier ${difficultyTier}. Size: ${enemyTeamSize}, Overflow: ${powerBudgetOverflow.toFixed(2)}`);

	// Get formations for the current team size
	let availableTemplates = FORMATION_TEMPLATES[enemyTeamSize];
	if (!availableTemplates?.length) {
		console.warn(`No formations available for team size: ${enemyTeamSize} (Tier: ${difficultyTier}). Defaulting to empty team.`);
		return [];
	}

	// Filter formations based on current round and potentially difficultyTier
	let validTemplates = availableTemplates.filter(template => {
		const roundCheck = !template.metadata.minRound || template.metadata.minRound <= round;
		// Optional: Add difficulty tier check for formations if desired
		// const tierCheck = !template.metadata.minTier || template.metadata.minTier === difficultyTier;
		// return roundCheck && tierCheck;
		return roundCheck;
	});

	// If no templates are valid for the current round, fall back to using any available template for that size.
	// This prevents getting an empty enemy team if the difficulty scales faster than the available formations for the round.
	if (validTemplates.length === 0) {
		console.warn(`No formations for team size ${enemyTeamSize} are valid for round ${round}. Falling back to all available templates for this size.`);
		validTemplates = availableTemplates;
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


	// Apply buffs based on difficulty tier and power budget overflow
	if (units.length > 0) { // Only apply buffs if there are units to buff
		switch (difficultyTier) {
			case DifficultyTier.Elite:
				units.forEach(unit => {
					unit.maxHp = Math.floor(unit.maxHp * 1.15); // +15% HP
					unit.hp = unit.maxHp; // Restore HP to new max
					unit.attackPower = Math.floor(unit.attackPower * 1.10); // +10% Attack
				});
				console.log("Applied Elite tier stat buffs to enemy team.");
				if (powerBudgetOverflow >= 0.5) {
					const randomUnit = pickOne(units);
					randomUnit.hasted += 3000; // 3 seconds of haste
					console.log(`Elite tier: ${randomUnit.name} gained 3s of haste.`);
				}
				break;
			case DifficultyTier.Veteran:
				units.forEach(unit => {
					unit.maxHp = Math.floor(unit.maxHp * 1.10); // +10% HP
					unit.hp = unit.maxHp; // Restore HP to new max
					unit.attackPower = Math.floor(unit.attackPower * 1.05); // +5% Attack
				});
				console.log("Applied Veteran tier stat buffs to enemy team.");
				if (powerBudgetOverflow >= 0.3) {
					const randomUnit = pickOne(units);
					randomUnit.crit += 5; // +5% crit chance
					console.log(`Veteran tier: ${randomUnit.name} gained +5% crit chance.`);
				}
				break;
			case DifficultyTier.Challenger:
				units.forEach(unit => {
					unit.maxHp = Math.floor(unit.maxHp * 1.05); // +5% HP
					unit.hp = unit.maxHp; // Restore HP to new max
				});
				console.log("Applied Challenger tier stat buffs to enemy team.");
				if (powerBudgetOverflow >= 0.7) {
					const randomUnit = pickOne(units);
					randomUnit.attackPower = Math.floor(randomUnit.attackPower * 1.05); // +5% Attack
					console.log(`Challenger tier: ${randomUnit.name} gained +5% attack.`);
				}
				break;
			default:
				console.log("No specific difficulty tier buffs applied.");
				break;
		}
	}

	return units;
}
