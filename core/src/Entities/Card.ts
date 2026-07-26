import { Unit, CardDefinition, Effect, CombatState, SessionData, GLOBAL_REACTIONS } from "../Models";
import * as uuid from "uuid";
import { CARDS_BY_ID, ALL_CARDS } from "../data/BaseCollection";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a card definition's reactions.
 * Returns a list of design issues (empty = valid).
 *
 * A reaction with `position: "self"` can only fire for global reaction IDs
 * (on_crit, every_100_damage, on_battle_start, ...): processReactions
 * excludes the triggering unit from candidates for every other effect, so
 * e.g. `{ position: "self", effectId: "damage" }` would never react to the
 * unit's own damage. This catches designer mistakes at data-load time.
 */
export const validateCardDefinition = (card: CardDefinition): string[] => {
	const issues: string[] = [];
	for (const r of card.reactions ?? []) {
		if (r.position === "self" && !GLOBAL_REACTIONS.includes(r.effectId)) {
			issues.push(
				`Card "${card.id}": reaction with position "self" and effectId "${r.effectId}" can never fire ` +
				`(the triggering unit is excluded from reaction candidates unless the effect is a global reaction).`
			);
		}
	}
	return issues;
};

// ---------------------------------------------------------------------------
// Card lookup (simplified static model)
// ---------------------------------------------------------------------------

const DUMMY_CARD: CardDefinition = {
	id: "dummy_card",
	pic: "boss_andromeda",
	power: 10,
	cooldown: 2300,
	rank: 1,
	reactions: [],
	effects: [
		{
			id: "shield",
		} as Effect,
	],
};

/**
 * Module-level card lookup — defaults to the static BaseCollection data.
 * Tests can override with setCardsMap() / resetCardsMap() for isolation.
 */
let cardsById: ReadonlyMap<string, CardDefinition> = CARDS_BY_ID;

/** Override the card lookup (for test isolation). */
export const setCardsMap = (map: ReadonlyMap<string, CardDefinition>): void => {
	cardsById = map;
};

/** Reset the card lookup to the static BaseCollection defaults. */
export const resetCardsMap = (): void => {
	cardsById = CARDS_BY_ID;
};

// ---------------------------------------------------------------------------
// Public query helpers
// ---------------------------------------------------------------------------

export const getCardDefinition = (id: string): CardDefinition =>
	cardsById.get(id) ?? DUMMY_CARD;

export const hasCardDefinition = (id: string): boolean =>
	cardsById.has(id);

export const getAllCards = (): CardDefinition[] =>
	Array.from(cardsById.values());

export const getCores = (): CardDefinition[] =>
	Array.from(cardsById.values()).filter((card) => card.isCore);

export const getNonCores = (): CardDefinition[] =>
	Array.from(cardsById.values()).filter((card) => !card.isCore);

export const getAvailableCards = (unlockedUnitIds: string[]): CardDefinition[] =>
	Array.from(cardsById.values()).filter(
		(card) => !card.isCore && (!card.locked || unlockedUnitIds.includes(card.id))
	);

// ---------------------------------------------------------------------------
// Unit creation
// ---------------------------------------------------------------------------

export const getBattleCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force === forceId && u.isCore)!;

export const getEnemyCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force !== forceId && u.isCore)!;

export const getPlayerPersistentCore = (state: SessionData) =>
	state.team.units.find((u) => u.isCore)!;

// Creates a Unit from a cardId string — thin wrapper around createUnitFromCardSpec.
export const makeUnit = (
	force: string,
	cardId: string, position: [number, number] = [1, 1]): Unit => {
	const card = getCardDefinition(cardId);
	return createUnitFromCardSpec(force, card, position, uuid.v4()) as Unit;
};

export function createUnitFromCardSpec(
	force: string,
	cardDef: CardDefinition,
	position: [number, number] = [0, 0],
	id: string
): Unit {
	const effects = structuredClone(cardDef.effects ?? []);
	const reactions = structuredClone(cardDef.reactions ?? []);

	return {
		id,
		cardId: cardDef.id,
		pic: cardDef.pic,
		force,
		position,
		power: cardDef.power || 0,
		cooldown: cardDef.cooldown,
		evade: 0,
		rank: cardDef.rank || 1,
		effects,
		reactions,
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: cardDef.isCore || false,
		life: cardDef.life || 0,
		maxLife: cardDef.life || 0,
		critical: cardDef.critical || 0,
		shield: 0,
		bonusPower: 0,
	};
}

// Run validation on the static collection at module load
ALL_CARDS.forEach((card) => {
	const issues = validateCardDefinition(card);
	if (issues.length > 0) {
		console.warn("cardRegistry", ...issues);
	}
});
