import { Effect, EffectReaction } from "../../TriggerSystem/TriggerSystem";

const dummy: CardDefinition = {
  "id": "dummy_card",
  "name": "Dummyy",
  "pic": "boss_andromeda",
  "power": 10,
  "cooldown": 2300,
  "description": "",
  "reactions": [],
  "effects": [
    {
      "id": "shield"
    } as Effect
  ]
}

let cards = new Map<string, CardDefinition>();

const registerCard = (card: CardDefinition): void => {
  cards.set(card.id, card);
};


let collections = new Map<string, CardCollection>();
export const registerCollection = (collection: CardCollection): void => {
  collections.set(collection.id, collection);

  collection.cards
    //.slice(0, 5)
    .forEach(registerCard);

};

export type CardCollection = {
  id: string;
  name: string;
  description: string;
  pic: string;
  cards: CardDefinition[];
}

/**
 * Defines the "blueprint" or "specification" for a game entity (often a character or creature).
 * It holds all the static, inherent properties of a type of unit, such as its name,
 * visual appearance (pic), base stats (attack, defense, cooldown).
 * A `CardDefinition` is used to create `Unit` instances.
 */
export type CardDefinition = {
  id: string;
  pic: string;
  name: string;
  description: string;
  power: number;
  cooldown: number;
  effects: Effect[];
  reactions: EffectReaction[];
  isCore?: boolean;
};

export const getCardDefinition = (id: string): CardDefinition => {
  const card = cards.get(id);
  if (!card) {
    return dummy
  }
  return card;
}

export const getCollection = (id: string): CardCollection => {
  const collection = collections.get(id);
  if (!collection) {
    throw new Error(`Collection with id ${id} not found`);
  }
  return collection;
}

export const getAllCards = (): CardDefinition[] => {
  return Array.from(cards.values());
}

export const getCores = (): CardDefinition[] => {
  return Array.from(cards.values()).filter(card => card.isCore);
}

export const getNonCores = (): CardDefinition[] => {
  return Array.from(cards.values()).filter(card => !card.isCore);
}

export const getAlliedCore = (forceId: string) => state.battleData.units.find(u => u.force === forceId && u.isCore)!;
export const getEnemyCore = (forceId: string) => state.battleData.units.find(u => u.force !== forceId && u.isCore)!;

