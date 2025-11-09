import * as uuid from "uuid";
import { CardDefinition, getCardDefinition } from "./Card";
import * as TriggerSystem from "../../TriggerSystem/TriggerSystem";

export type Unit = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;

  power: number;

  lifesteal?: boolean;
  critical?: number;
  reflect?: number;

  // Core attributes
  life: number;
  maxLife: number;
  shield: number;
  poison: number;
  regen: number;

  cooldown: number;
  evade: number;

  effects: TriggerSystem.Effect[];
  reactions: TriggerSystem.EffectReaction[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  hasted: number;
  slowed: number;

  isCore: boolean;

};

export const makeUnit = (force: string, cardId: string, position = { x: 0, y: 0 }): Unit => {
  const card = getCardDefinition(cardId);


  const pureUnit = createUnitFromCard(
    force,
    card,
    position,
    uuid.v4()
  ) as Unit;

  console.log({ card, pureUnit })

  return pureUnit;
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

  critical?: number;

  isCore?: boolean;
  life?: number;
  maxLife?: number;
  shield?: number;
  poison?: number;
  regen?: number;

  reactions: {
    position: TriggerSystem.EffectSourcePosition;
    effectId: string; // e.g. "damage", "heal", "shield", "poison", "regen", "haste", "slow", "charge"
    effects: TriggerSystem.Effect[]
  }[];
};

export function createUnitFromCard(
  force: string,
  cardDef: CardDefinition,
  position: Vec2 = { x: 0, y: 0 },
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
    slowed: 0,
    isCore: cardDef.isCore || false,
    life: cardDef.life || 0,
    maxLife: cardDef.life || 0,
    critical: cardDef.critical || 0,
    shield: 0,
    regen: 0,
    poison: 0,
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
    isCore: false,
    life: 0,
    shield: 0,
    poison: 0,
    regen: 0,
  };

  return {
    id: baseProps.id,
    force: baseProps.force,
    position: baseProps.position || { x: 0, y: 0 },
    ...defaults,
    ...overrides
  };
}

export function createTestUnit(
  id: string,
  force: string,
  position: Vec2 = { x: 0, y: 0 }
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

export function isCritical(u: Unit) {
  return !!u.critical && Math.random() * 100 < u.critical;
}

function upgradeEffect(definition: CardDefinition, eff: TriggerSystem.Effect) {

  if (["damage", "heal", "shield", "poison", "regen"].includes(eff.id))
    return;

  const original = definition.effects.find(e => e.id === eff.id)!;

  if (["increase_power", "increase_power_on_type", "multiply_power", "increase_critical"].includes(eff.id)) {
    if ('amount' in eff && 'amount' in original) {
      eff.amount += original.amount;
    }
  }

  // For now, only increase durationi (also evaluate increasing targets)
  if (["haste", "slow", "charge"].includes(eff.id)) {
    if ('duration' in eff && 'duration' in original) {
      eff.duration += original.duration;
    }

  }

}

export function upgradeUnitEffects(unit: Unit) {

  const definition = getCardDefinition(unit.cardId);


  unit.effects.forEach((eff) => {
    upgradeEffect(definition, eff);
  });

  unit.reactions.forEach(r => {
    r.effects.forEach(eff => {
      upgradeEffect(definition, eff);
    })
  });

}