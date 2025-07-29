import { TraitDefinition } from "../../TraitSystem/TraitEffectSystem";
import * as t from "../../TraitSystem/Traits";

let cards = new Map<string, CardDefinition>();


const registerCard = (card: CardDefinition): void => {
  if (cards.has(card.id)) {
    throw new Error(`Card with id ${card.id} already exists.`);
  }
  cards.set(card.id, card);
};


let collections = new Map<string, CardCollection>();
export const registerCollection = (collection: CardCollection): void => {
  if (collections.has(collection.id)) {
    throw new Error(`Collection with id ${collection.id} already exists.`);
  }
  collections.set(collection.id, collection);

  collection.cards
    .slice(0, 10)
    .forEach(registerCard);

};

export type CardCollection = {
  id: string;
  name: string;
  description: string;
  pic: string;
  cards: CardDefinition[];
  traits: TraitDefinition[]
}

/**
 * Defines the "blueprint" or "specification" for a game entity (often a character or creature).
 * It holds all the static, inherent properties of a type of unit, such as its name,
 * visual appearance (pic), base stats (attack, defense, cooldown), and default traits.
 * A `CardDefinition` is used to create `Unit` instances.
 */
export type CardDefinition = {
  id: string;
  pic: string;
  name: string;
  description: string;
  power: number;
  cooldown: number;
  traits: t.TraitData[]
  tags: string[];
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
