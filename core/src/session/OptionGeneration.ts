/**
 * Encounter and Shop Option Generation
 *
 * Pure functions for generating available player choices during different game phases.
 * Deterministic based on session seed to ensure reproducibility across replays.
 */

import * as Models from "../Models";
import * as Card from "../Entities/Card";
import { CardDefinition } from "../Models";
import * as Random from "../math/Random";
import type { EncounterId } from "../types/action";

type EncounterFilterType =
	| "damage"
	| "heal"
	| "shield"
	| "regen"
	| "poison"
	| "haste"
	| "slow"
	| "charge"
	| "increase_power"
	| "increase_critical"
	| "silver"
	| "gold";

/** Describes a known encounter with its filter type for shop generation. */
type EncounterDefinition = {
	id: EncounterId;
	filterType: EncounterFilterType | null;
};

const ENCOUNTERS: EncounterDefinition[] = [
	{ id: "upgrade_unit", filterType: null },
	{ id: "armory", filterType: "damage" },
	{ id: "healing_tent", filterType: "heal" },
	{ id: "frontier_fort", filterType: "shield" },
	{ id: "forest_pools", filterType: "regen" },
	{ id: "toxic_chamber", filterType: "poison" },
	{ id: "trial_circuit", filterType: "haste" },
	{ id: "trappers_guild", filterType: "slow" },
	{ id: "thunder_spire", filterType: "charge" },
	{ id: "commanders_tent", filterType: "increase_power" },
	{ id: "assassins_hideout", filterType: "increase_critical" },
	{ id: "power_distributor", filterType: null },
	{ id: "power_absorber", filterType: null },
	{ id: "silver_shop", filterType: "silver" },
	{ id: "gold_shop", filterType: "gold" },
];

const ENCOUNTER_IDS: EncounterId[] = ENCOUNTERS.map((e) => e.id);

export function createEncounterOptions(
	session: Models.SessionData,
): { options: Models.PhaseOption[]; encounterHistory: EncounterId[] } {

	// Initialize encounter history if it doesn't exist
	const history = session.encounter_history ? [...session.encounter_history] : [];

	// Get the last 12 encounters (4 phases × 3 options each)
	const recentlyShownEncounters = new Set(history.slice(-12));

	const seedNum = Random.stringToSeed(session.seed);
	const shuffled = Random.shuffleWithSeed(ENCOUNTER_IDS, seedNum);

	// Filter out recently shown encounters
	const availableEncounters = shuffled.filter((id) => !recentlyShownEncounters.has(id));

	// If we don't have enough encounters (very rare), use all encounters
	const encountersToShow = availableEncounters.length >= 3 ? availableEncounters : shuffled;
	const selectedOptions = encountersToShow.slice(0, 3);

	// Return the updated history alongside the options
	return {
		options: selectedOptions.map((id) => ({ id })),
		encounterHistory: [...history, ...selectedOptions] as EncounterId[],
	};
}

/**
 * Look up the filter type for a given encounter id.
 */
function getEncounterFilterType(encounterId: string | null): EncounterFilterType | "" {
	if (!encounterId) return "";

	const def = ENCOUNTERS.find((e) => e.id === encounterId);
	return def?.filterType ?? "";
}

function getCardRank(card: CardDefinition): number {
	return card.rank ?? 1;
}

function cardMatchesEffectType(
	card: CardDefinition,
	filterType: Exclude<EncounterFilterType, "silver" | "gold">
): boolean {
	return (
		card.effects?.some((effect) => effect.id === filterType) ||
		card.reactions?.some((reaction) => reaction.effects?.some((effect) => effect.id === filterType))
	);
}

/**
 * Filter cards by effect type, supporting both direct effects and reactions.
 */
function filterCardsByEffect(
	cards: CardDefinition[],
	filterType: EncounterFilterType
): CardDefinition[] {
	if (filterType === "silver") {
		return cards.filter((card) => getCardRank(card) === 2);
	}

	if (filterType === "gold") {
		return cards.filter((card) => getCardRank(card) === 3);
	}

	return cards.filter(
		(card) => getCardRank(card) === 1 && cardMatchesEffectType(card, filterType)
	);
}

/**
 * Generate the shop card options available after an encounter.
 * - Gold shop: 1 option (high-quality unit)
 * - Silver shop: 2 options (mid-tier units)
 * - Other encounters: 3 options (standard selection)
 */
export function generateShopOptions(
	session: Models.SessionData,
	action: Models.Action
): Models.PhaseOption[] {

	if (action.type !== "select_encounter") {
		throw new Error(`Expected action type 'select_encounter' for generating shop options, got '${action.type}'`);
	}

	const { encounterId } = action;

	// Determine number of options based on shop tier
	let numOptions = 3; // Default for most encounters
	if (encounterId === "gold_shop") {
		numOptions = 1; // Gold shop: single premium unit
	} else if (encounterId === "silver_shop") {
		numOptions = 2; // Silver shop: two quality options
	}

	const filterType = getEncounterFilterType(encounterId);
	let filteredCards = Card.getNonCores();

	if (filterType) {
		filteredCards = filterCardsByEffect(
			filteredCards,
			filterType,
		);
	}

	// Filter out cards where player already has a platinum (rank 4) unit
	const playerUnits = session.team?.units || [];
	const maxRankCardIds = new Set(playerUnits.filter((u) => u.rank >= 4).map((u) => u.cardId));
	filteredCards = filteredCards.filter((card) => !maxRankCardIds.has(card.id));

	// Derive a numeric seed from the session seed so shop contents are
	// deterministic and reproducible during server-side replay.
	// We mix the current seed with "shop" and the encounter id to ensure
	// encounter options and shop options never collide in their seed space.
	//const shopSeedInput = session.seed + "shop" + (encounterId ?? "");
	const options = Random.pickRandomItemsSeeded(session, filteredCards, numOptions).map((card) => ({
		id: card.id,
		cost: 10,
		recruitRank: getCardRank(card),
	}));

	return options;
}
