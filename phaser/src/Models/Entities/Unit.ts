import * as uuid from "uuid";
import { vec2Zero } from "../Geometry";
import { getCardDefinition } from "./Card";
import * as TriggerSystem from "../../TriggerSystem/TriggerSystem";

export type Unit = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;

  power: number;

  cooldown: number;
  crit: number;
  evade: number;

  effects: TriggerSystem.Effect[];
  reactions: TriggerSystem.EffectReaction[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  hasted: number;
  slowed: number;

};

export const makeUnit = (force: string, cardId: string, position = vec2Zero()): Unit => {
  const card = getCardDefinition(cardId);

  const pureUnit = createUnitFromCard(
    force,
    {
      id: card.id,
      name: card.name,
      pic: card.pic,
      power: card.power,
      cooldown: card.cooldown,
      effects: card.effects || [],
      reactions: card.reactions || [],
    },
    position,
    uuid.v4()
  );

  return pureUnit as Unit;
};

export type CardDefinition = {
  id: string;
  name: string;
  pic: string;
  power: number;
  cooldown: number;
  effects: TriggerSystem.Effect[];
  reactions: TriggerSystem.EffectReaction[];
};

export type PureUnitData = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;
  power: number;
  cooldown: number;
  crit: number;
  evade: number;
  charge: number;
  refresh: number;
  hasted: number;
  slowed: number;
  effects: TriggerSystem.Effect[];
  reactions: {
    position: TriggerSystem.EffectSourcePosition;
    effectId: string; // e.g. "damage", "heal", "shield", "poison", "regen", "haste", "slow", "charge"
    effects: TriggerSystem.Effect[]
  }[];
};

export function createUnitFromCard(
  force: string,
  cardDef: CardDefinition,
  position: Vec2 = vec2Zero(),
  id: string
): PureUnitData {

  const effects = cardDef.effects ?? [];

  const reactions = cardDef.reactions ?? [];

  return {
    id,
    cardId: cardDef.id,
    name: cardDef.name,
    pic: cardDef.pic,
    force,
    position,
    power: cardDef.power || 0,
    cooldown: cardDef.cooldown,
    crit: 0,
    evade: 0,
    effects,
    reactions,
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0
  };
}

export function createCustomUnit(
  baseProps: {
    id: string;
    force: string;
    position?: Vec2;
  },
  overrides: Partial<Omit<PureUnitData, 'id' | 'force' | 'position'>> = {}
): PureUnitData {
  const defaults: Omit<PureUnitData, 'id' | 'force' | 'position'> = {
    cardId: `${baseProps.id}-card`,
    name: `Unit ${baseProps.id}`,
    pic: `${baseProps.id}.png`,
    power: 25,
    cooldown: 100,
    crit: 10,
    evade: 5,
    effects: [],
    reactions: [],
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
  };

  return {
    id: baseProps.id,
    force: baseProps.force,
    position: baseProps.position || vec2Zero(),
    ...defaults,
    ...overrides
  };
}

export function createTestUnit(
  id: string,
  force: string,
  position: Vec2 = vec2Zero()
): PureUnitData {
  return createCustomUnit({ id, force, position });
}

export const testCardDefinitions = {
  basicWarrior: {
    id: 'basic-warrior',
    name: 'Basic Warrior',
    pic: 'warrior.png',
    power: 30,
    cooldown: 100,
  },
  basicHealer: {
    id: 'basic-healer',
    name: 'Basic Healer',
    pic: 'healer.png',
    power: 20,
    cooldown: 120,
  },
  basicTank: {
    id: 'basic-tank',
    name: 'Basic Tank',
    pic: 'tank.png',
    power: 15,
    cooldown: 80,
  }
} as const;