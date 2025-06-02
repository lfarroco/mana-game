import * as t from "./Traits";

let cards = new Map<string, Card>();

//@ts-ignore
window.cards = cards;

const registerCard = (card: Card): void => {
  if (cards.has(card.name)) {
    throw new Error(`Card with name ${card.name} already exists.`);
  }
  cards.set(card.name, card);
};

let collections = new Map<string, CardCollection>();
export const registerCollection = (collection: CardCollection): void => {
  if (collections.has(collection.id)) {
    throw new Error(`Collection with id ${collection.id} already exists.`);
  }
  collections.set(collection.id, collection);

  collection.cards.forEach(registerCard);
};

export type CardCollection = {
  id: string;
  name: string;
  description: string;
  pic: string;
  cards: Card[];
  opponents: Opponent
}

type Opponent = {
  name: string;
  level: number;
  board: {
    layout: string[],
    map: { [key: string]: string }
  }
}

export type CardData = {
  name: string,
  pic: string,
  hp: number,
  atk: number,
  cooldown: number,
  projectile: string,
  traits: { id: string }[]
}

export type Card = {
  pic: string;
  name: string;
  description: string;
  hp: number;
  attack: number;
  defense: number;
  cooldown: number;
  traits: t.TraitData[]
};

export const getCard = (name: string): Card => {
  const card = cards.get(name);
  if (!card) {
    throw new Error(`Card with name ${name} not found.`);
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

export const getAllCards = (): Card[] => {
  return Array.from(cards.values());
}