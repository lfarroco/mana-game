/**
 * Session Initialization and Management
 *
 * Handles creation of new sessions and default state setup.
 * Pure functions — seed generation is left to the caller.
 */

import * as Models from "./Models";
import { Unit } from "./Models";
import * as Card from "./Entities/Card";
import * as Constants from "./Constants";
import * as OptionGeneration from "./OptionGeneration";


function generateDefaultSeed(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Create default run statistics object.
 */
export function createDefaultRunStats() {
	return {
		damageDealt: 0,
		poisonDealt: 0,
		shieldDealt: 0,
		regenDealt: 0,
		healDealt: 0,
		mostPowerfulUnit: null,
		totalUnitsRecruited: 0,
		unitUsage: {},
	};
}

/**
 * Create a new session for a player.
 * Requires an explicit seed so session creation is deterministic.
 * Optionally seeds with a crystal core if selectedCrystalId is provided.
 * Generates initial encounter options.
 */
export function createInitialSession(
	playerId: string,
	selectedCrystalId?: string,
	seed?: string,
): Models.SessionData {
	const sessionSeed = seed ?? generateDefaultSeed();
	const initialSeed = sessionSeed;

	const team: { units: Unit[] } = { units: [] };
	if (selectedCrystalId) {
		const coreUnit = Card.makeUnit(
			Constants.FORCE_ID_PLAYER,
			selectedCrystalId,
			[1, 1],
		);
		coreUnit.isCore = true;
		team.units.push(coreUnit);
	}

	const session: Models.SessionData = {
		id: "",
		player_id: playerId,
		session_type: { type: "singleplayer" },
		phase: "encounter",
		round: 1,
		step: 1,
		seed: sessionSeed,
		initial_seed: initialSeed,
		action_log: [],
		wins: 0,
		losses: 0,
		team,
		options: [],
		runStats: createDefaultRunStats(),
	};

	// Generate initial options
	const options = OptionGeneration.createEncounterOptions(session);
	session.options = options;

	return session;
}

/**
 * Validate and apply a team repositioning update.
 * Ensures units are not added/removed/modified, only repositioned.
 */
export function updateTeamAction(
	session: Models.SessionData,
	newUnits: Unit[]
): Models.SessionData {
	const currentUnits = session.team?.units || [];

	// Must have same number of units
	if (currentUnits.length !== newUnits.length) {
		console.warn("SessionManagement", `Team update rejected: expected ${currentUnits.length} units, got ${newUnits.length}`);
		return session;
	}

	const currentUnitMap = new Map<string, Unit>();
	currentUnits.forEach((u) => currentUnitMap.set(u.id, u));

	const validatedUnits = [];

	for (const newUnit of newUnits) {
		const originalUnit = currentUnitMap.get(newUnit.id);

		// Must be an existing unit
		if (!originalUnit) {
			console.warn("SessionManagement", `Team update rejected: unit with ID ${newUnit.id} does not exist in current team`);
			return session;
		}

		// Card and rank must not change
		if (originalUnit.cardId !== newUnit.cardId || originalUnit.rank !== newUnit.rank) {
			console.warn("SessionManagement", `Team update rejected: unit with ID ${newUnit.id} has mismatched cardId or rank`);
			return session;
		}

		// Position can change, everything else stays the same
		const validatedUnit = {
			...originalUnit,
			position: newUnit.position,
		};
		validatedUnits.push(validatedUnit);
	}

	session.team.units = validatedUnits;

	return session;
}
