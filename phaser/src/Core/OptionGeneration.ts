/**
 * Encounter and Shop Option Generation
 *
 * Pure functions for generating available player choices during different game phases.
 * Deterministic based on session seed to ensure reproducibility across replays.
 */

import * as Models from "@Core/Models";
import * as Card from "@Models/Entities/Card";
import * as Seeding from "./Seeding";

const ENCOUNTER_IDS = [
	"upgrade_unit",
	"armory",
	"healing_tent",
	"frontier_fort",
	"forest_pools",
	"toxic_chamber",
	"trial_circuit",
	"trappers_guild",
	"thunder_spire",
	"commanders_tent",
	"assassins_hideout",
	"power_distributor",
	"power_absorber",
	"silver_shop",
	"gold_shop",
];

export function createEncounterOptions(
	session: Models.SessionData,
): Models.PhaseOption[] {

	// Initialize encounter history if it doesn't exist
	if (!session.encounter_history) {
		session.encounter_history = [];
	}

	// Get the last 12 encounters (4 phases × 3 options each)
	const recentlyShownEncounters = new Set(session.encounter_history.slice(-12));

	const seedNum = Seeding.stringToSeed(session.seed);
	const shuffled = Seeding.shuffleWithSeed(ENCOUNTER_IDS, seedNum);

	// Filter out recently shown encounters
	const availableEncounters = shuffled.filter((id) => !recentlyShownEncounters.has(id));

	// If we don't have enough encounters (very rare), use all encounters
	const encountersToShow = availableEncounters.length >= 3 ? availableEncounters : shuffled;
	const selectedOptions = encountersToShow.slice(0, 3);

	// Add these encounters to the history
	session.encounter_history.push(...selectedOptions);

	return selectedOptions.map((id) => ({ id }));
}

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

/**
 * Map encounter ID to the effect type it should filter shop options by.
 */
function getEncounterFilterType(encounterId: string | null): EncounterFilterType | "" {
	if (!encounterId) return "";

	// TODO: should have a single id for type, this map should
	// not be necessary
	const filterMap: Record<string, EncounterFilterType> = {
		armory: "damage",
		healing_tent: "heal",
		frontier_fort: "shield",
		forest_pools: "regen",
		toxic_chamber: "poison",
		trial_circuit: "haste",
		trappers_guild: "slow",
		thunder_spire: "charge",
		commanders_tent: "increase_power",
		assassins_hideout: "increase_critical",
		silver_shop: "silver",
		gold_shop: "gold",
	};

	return filterMap[encounterId] || "";
}

function getCardRank(card: Card.CardDefinition): number {
	return card.rank ?? 1;
}

function cardMatchesEffectType(
	card: Card.CardDefinition,
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
	cards: Card.CardDefinition[],
	filterType: EncounterFilterType
): Card.CardDefinition[] {
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
	const shopSeedInput = session.seed + "shop" + (encounterId ?? "");
	const options = Seeding.pickRandomItemsSeeded(shopSeedInput, filteredCards, numOptions).map((card) => ({
		id: card.id,
		cost: 10,
		recruitRank: getCardRank(card),
	}));

	return options;
}
