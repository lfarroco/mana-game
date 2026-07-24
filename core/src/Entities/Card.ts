import { Unit, CardDefinition, CardCollection, Effect, CombatState, SessionData, GLOBAL_REACTIONS } from "../Models";
import * as uuid from "uuid";

/**
 * Validate a card definition's reactions at registration time.
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

// FIXME: the card registry global singleton could be simplified —
// the registerCollection step is only used at startup and could be
// replaced with a direct Map population or static import.

const dummy: CardDefinition = {
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

export type CardRegistry = {
	getCardDefinition: (id: string) => CardDefinition;
	hasCardDefinition: (id: string) => boolean;
	getCollection: (id: string) => CardCollection;
	getAllCards: () => CardDefinition[];
	getCores: () => CardDefinition[];
	getNonCores: () => CardDefinition[];
	getAvailableCards: (unlockedUnitIds: string[]) => CardDefinition[];
	registerCollection: (collection: CardCollection) => void;
	reset: () => void; // For test isolation
};

export const createCardRegistry = (): CardRegistry => {
	const cards = new Map<string, CardDefinition>();
	const collections = new Map<string, CardCollection>();

	const registerCard = (card: CardDefinition): void => {
		validateCardDefinition(card).forEach((issue) => console.warn("cardRegistry", issue));
		cards.set(card.id, card);
	};

	const registerCollection = (collection: CardCollection): void => {
		collections.set(collection.id, collection);
		collection.cards.forEach(registerCard);
	};

	return {
		getCardDefinition: (id: string): CardDefinition => {
			const card = cards.get(id);
			if (!card) {
				return dummy;
			}
			return card;
		},

		hasCardDefinition: (id: string): boolean => {
			return cards.has(id);
		},

		getCollection: (id: string): CardCollection => {
			const collection = collections.get(id);
			if (!collection) {
				throw new Error(`Collection with id ${id} not found`);
			}
			return collection;
		},

		getAllCards: (): CardDefinition[] => Array.from(cards.values()),

		getCores: (): CardDefinition[] =>
			Array.from(cards.values()).filter((card) => card.isCore),

		getNonCores: (): CardDefinition[] =>
			Array.from(cards.values()).filter((card) => !card.isCore),

		getAvailableCards: (unlockedUnitIds: string[]): CardDefinition[] =>
			Array.from(cards.values()).filter(
				(card) => !card.isCore && (!card.locked || unlockedUnitIds.includes(card.id))
			),

		registerCollection,

		reset: () => {
			cards.clear();
			collections.clear();
		},
	};
};

// Default global registry — populated at startup via registerCollection.
// Tests should use createCardRegistry() for isolation.
const defaultRegistry = createCardRegistry();

export const registerCollection = (collection: CardCollection): void =>
	defaultRegistry.registerCollection(collection);

export const getCardDefinition = (id: string): CardDefinition =>
	defaultRegistry.getCardDefinition(id);

export const hasCardDefinition = (id: string): boolean =>
	defaultRegistry.hasCardDefinition(id);

export const getCollection = (id: string): CardCollection =>
	defaultRegistry.getCollection(id);

export const getAllCards = (): CardDefinition[] =>
	defaultRegistry.getAllCards();

export const getCores = (): CardDefinition[] =>
	defaultRegistry.getCores();

export const getNonCores = (): CardDefinition[] =>
	defaultRegistry.getNonCores();

export const getAvailableCards = (unlockedUnitIds: string[]): CardDefinition[] =>
	defaultRegistry.getAvailableCards(unlockedUnitIds);

/** Reset the global registry — for test isolation. */
export const resetRegistry = (): void => defaultRegistry.reset();

export const getAlliedCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force === forceId && u.isCore)!;
export const getEnemyCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force !== forceId && u.isCore)!;

export const getBattleCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force === forceId && u.isCore)!;

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
	const effects = JSON.parse(JSON.stringify(cardDef.effects ?? []));
	const reactions = JSON.parse(JSON.stringify(cardDef.reactions ?? []));

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

