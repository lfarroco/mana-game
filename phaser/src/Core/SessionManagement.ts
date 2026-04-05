/**
 * Session Initialization and Management
 *
 * Handles creation of new sessions and default state setup.
 */

import { SessionData } from "@Core/Types";
import { Unit, makeUnit } from "@Models/Entities/Unit";
import { FORCE_ID_PLAYER } from "@Core/Combat/CombatConstants";

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
 * Optionally seeds with a crystal core if selectedCrystalId is provided.
 * Generates initial encounter options.
 */
export function createInitialSession(
	playerId: string,
	selectedCrystalId?: string,
	explicitSeed?: string
): SessionData {
	// Import here to avoid circular dependency
	const { generateEncounterOptions } = require("./OptionGeneration");

	const seed = explicitSeed ?? Math.random().toString(36).substring(7);
	const initialSeed = seed;

	const team: { units: Unit[] } = { units: [] };
	if (selectedCrystalId) {
		const coreUnit = makeUnit(FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
		coreUnit.isCore = true;
		team.units.push(coreUnit);
	}

	const session: SessionData = {
		id: "",
		player_id: playerId,
		session_type: "singleplayer",
		phase: "encounter",
		round: 1,
		step: 1,
		seed,
		initial_seed: initialSeed,
		action_log: [],
		wins: 0,
		losses: 0,
		team,
		current_options: null,
		runStats: createDefaultRunStats(),
	};

	// Generate initial options
	const options = generateEncounterOptions(session);
	session.current_options = { options: options.options };

	return session;
}

/**
 * Validate and apply a team repositioning update.
 * Ensures units are not added/removed/modified, only repositioned.
 */
export function validateAndApplyTeamUpdate(
	session: SessionData,
	newTeam: { units: Unit[] }
): { team: { units: Unit[] }; valid: boolean } {
	const currentUnits = session.team?.units || [];
	const newUnits = newTeam?.units || [];

	// Must have same number of units
	if (currentUnits.length !== newUnits.length) {
		return { team: session.team, valid: false };
	}

	const currentUnitMap = new Map<string, Unit>();
	currentUnits.forEach((u) => currentUnitMap.set(u.id, u));

	const validatedUnits = [];

	for (const newUnit of newUnits) {
		const originalUnit = currentUnitMap.get(newUnit.id);

		// Must be an existing unit
		if (!originalUnit) {
			return { team: session.team, valid: false };
		}

		// Card and rank must not change
		if (originalUnit.cardId !== newUnit.cardId || originalUnit.rank !== newUnit.rank) {
			return { team: session.team, valid: false };
		}

		// Position can change, everything else stays the same
		const validatedUnit = {
			...originalUnit,
			position: newUnit.position,
		};
		validatedUnits.push(validatedUnit);
	}

	return { team: { units: validatedUnits }, valid: true };
}
