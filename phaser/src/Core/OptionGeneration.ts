/**
 * Encounter and Shop Option Generation
 *
 * Pure functions for generating available player choices during different game phases.
 * Deterministic based on session seed to ensure reproducibility across replays.
 */

import { SessionData, PhaseOption } from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import { stringToSeed, pickRandomItemsSeeded, shuffleWithSeed } from "./Seeding";
import { getPhaseForTurn } from "@Core/PhaseSystem/PhaseConfig";

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

/**
 * Generate the three encounter options available to the player.
 * Uses recent encounter history to avoid repetition within the last 12 encounters.
 */
export function generateEncounterOptions(session: SessionData): {
	options: PhaseOption[];
	nextPhase?: string;
} {
	// Check what phase we should be at for this turn
	const expectedPhase = getPhaseForTurn(session.round, session.step);

	// If the expected phase is combat, show combat_encounter as the only option (pre-combat warning)
	if (expectedPhase === "combat") {
		return { options: [{ id: "combat_encounter" }] };
	}

	// Initialize encounter history if it doesn't exist
	if (!session.encounter_history) {
		session.encounter_history = [];
	}

	// Get the last 12 encounters (4 phases × 3 options each)
	const recentlyShownEncounters = new Set(session.encounter_history.slice(-12));

	const seedNum = stringToSeed(session.seed);
	const shuffled = shuffleWithSeed(ENCOUNTER_IDS, seedNum);

	// Filter out recently shown encounters
	const availableEncounters = shuffled.filter((id) => !recentlyShownEncounters.has(id));

	// If we don't have enough encounters (very rare), use all encounters
	const encountersToShow = availableEncounters.length >= 3 ? availableEncounters : shuffled;
	const selectedOptions = encountersToShow.slice(0, 3);

	// Add these encounters to the history
	session.encounter_history.push(...selectedOptions);

	return { options: selectedOptions.map((id) => ({ id })) };
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

/**
 * Filter cards by effect type, supporting both direct effects and reactions.
 */
function filterCardsByEffect(cards: any[], filterType: EncounterFilterType): any[] {
	if (filterType === "silver") {
		return cards.filter((card) => card.rank === 2);
	}

	if (filterType === "gold") {
		return cards.filter((card) => card.rank === 3);
	}

	if (filterType) {
		return cards.filter(
			(card: any) =>
				card.effects?.some((eff: any) => eff.id === filterType) ||
				card.reactions?.some((react: any) => react.effects?.some((eff: any) => eff.id === filterType))
		);
	}

	return cards;
}

/**
 * Generate the three shop card options available after an encounter.
 */
export function generateShopOptions(
	session: SessionData,
	triggerActionId?: string
): { options: PhaseOption[] } {
	let encounterId = null;

	if (triggerActionId) {
		encounterId = triggerActionId;
	} else {
		const previousStep = session.step - 1;
		// Look for the most recent ENCOUNTER action at the previous step
		const encounterActions = session.action_log.filter(
			(a) => a.round === session.round && a.step === previousStep && a.phase === "encounter"
		);
		const lastEncounterAction = encounterActions[encounterActions.length - 1];
		encounterId = lastEncounterAction ? lastEncounterAction.actionId : null;
	}

	const filterType = getEncounterFilterType(encounterId);
	let filteredCards = Card.getNonCores();

	if (filterType) {
		filteredCards = filterCardsByEffect(filteredCards, filterType);
	}

	if (filteredCards.length === 0) {
		filteredCards = Card.getNonCores();
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
	const options = pickRandomItemsSeeded(shopSeedInput, filteredCards, 3).map((card) => ({
		id: card.id,
		cost: 10,
	}));

	return { options };
}
