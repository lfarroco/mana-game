import { Unit, CardDefinition, CardCollection, Effect, CombatState, SessionData } from "../Models";
import * as uuid from "uuid";

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

const cards = new Map<string, CardDefinition>();

const registerCard = (card: CardDefinition): void => {
	cards.set(card.id, card);
};

const collections = new Map<string, CardCollection>();
export const registerCollection = (collection: CardCollection): void => {
	collections.set(collection.id, collection);

	collection.cards
		//.slice(0, 5)
		.forEach(registerCard);
};

export const getCardDefinition = (id: string): CardDefinition => {
	const card = cards.get(id);
	if (!card) {
		return dummy;
	}
	return card;
};

export const hasCardDefinition = (id: string): boolean => {
	return cards.has(id);
};

export const getCollection = (id: string): CardCollection => {
	const collection = collections.get(id);
	if (!collection) {
		throw new Error(`Collection with id ${id} not found`);
	}
	return collection;
};

export const getAllCards = (): CardDefinition[] => Array.from(cards.values());

export const getCores = (): CardDefinition[] =>
	Array.from(cards.values()).filter((card) => card.isCore);

export const getNonCores = (): CardDefinition[] =>
	Array.from(cards.values()).filter((card) => !card.isCore);

export const getAvailableCards = (unlockedUnitIds: string[]): CardDefinition[] =>
	Array.from(cards.values()).filter(
		(card) => !card.isCore && (!card.locked || unlockedUnitIds.includes(card.id))
	);

export const getAlliedCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force === forceId && u.isCore)!;
export const getEnemyCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force !== forceId && u.isCore)!;

export const getBattleCore = (state: CombatState) => (forceId: string) =>
	state.units.find((u) => u.force === forceId && u.isCore)!;

export const getPlayerPersistentCore = (state: SessionData) =>
	state.team.units.find((u) => u.isCore)!;

// TODO: this is the same as createUnitFromCardSpec
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

