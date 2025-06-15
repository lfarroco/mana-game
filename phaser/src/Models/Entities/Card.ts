import { TraitDefinition } from "../../TraitSystem/TraitEffectSystem";
import * as t from "../../TraitSystem/Traits";

let cards = new Map<string, CardDefinition>();


let relicDefinitions = new Map<string, RelicDefinition>();

const registerCard = (card: CardDefinition): void => {
  if (cards.has(card.id)) {
    throw new Error(`Card with id ${card.id} already exists.`);
  }
  cards.set(card.id, card);
};

const registerRelicDefinition = (relicDef: RelicDefinition): void => {
  if (relicDefinitions.has(relicDef.id)) {
    throw new Error(`RelicDefinition with id ${relicDef.id} already exists.`);
  }
  relicDefinitions.set(relicDef.id, relicDef);
};

let collections = new Map<string, CardCollection>();
export const registerCollection = (collection: CardCollection): void => {
  if (collections.has(collection.id)) {
    throw new Error(`Collection with id ${collection.id} already exists.`);
  }
  collections.set(collection.id, collection);

  collection.cards.forEach(registerCard);

  collection.relics.forEach(registerRelicDefinition);

};

export type CardCollection = {
  id: string;
  name: string;
  description: string;
  pic: string;
  cards: CardDefinition[];
  relics: RelicDefinition[];
  traits: TraitDefinition[]
}

/**
 * Defines the "blueprint" or "specification" for a game entity (often a character or creature).
 * It holds all the static, inherent properties of a type of unit, such as its name,
 * visual appearance (pic), base stats (hp, attack, defense, cooldown), and default traits.
 * A `CardDefinition` is used to create `Unit` instances.
 */
export type CardDefinition = {
  id: string;
  pic: string;
  name: string;
  description: string;
  hp: number;
  attack: number;
  defense: number;
  cooldown: number;
  traits: t.TraitData[]
};

export type RelicDefinition = {
  id: string;
  name: string;
  pic: string;
  description: string;
  cost: number;
  traits: t.TraitData[]
};

export const getCardDefinition = (id: string): CardDefinition => {
  const card = cards.get(id);
  if (!card) {
    throw new Error(`Card with id ${id} not found.`);
  }
  return card;
}

export const getCollection = (id: string): CardCollection => {
  const collection = collections.get(id);
  if (!collection) {
    throw new Error(`Collection with id ${id} not found.`);
  }
  return collection;
}

export const getAllCards = (): CardDefinition[] => {
  return Array.from(cards.values());
}

export const getRelicDefinition = (id: string): RelicDefinition => {
  const relicDef = relicDefinitions.get(id);
  if (!relicDef) {
    throw new Error(`RelicDefinition with id ${id} not found.`);
  }
  return relicDef;
}

export const getAllRelicDefinitions = (): RelicDefinition[] => {
  return Array.from(relicDefinitions.values());
}