/**
 * Session Initialization and Management
 *
 * Handles creation of new sessions and default state setup.
 */

import * as Models from "@game/Models";
import { Unit } from "@game/Models";
import * as Card from "@game/Entities/Card";
import * as CombatConstants from "@game/CombatConstants";
import * as OptionGeneration from "./OptionGeneration";


const generateRandomSessionSeed = (): string => {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

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
): Models.SessionData {
	const seed = explicitSeed ?? generateRandomSessionSeed();
	const initialSeed = seed;

	const team: { units: Unit[] } = { units: [] };
	if (selectedCrystalId) {
		const coreUnit = Card.makeUnit(
			CombatConstants.FORCE_ID_PLAYER,
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
		seed,
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
