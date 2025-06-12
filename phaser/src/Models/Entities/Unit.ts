import { v4 } from "uuid";
import { Vec2, vec2Zero } from "../Geometry";
import { TraitData } from "../../TraitSystem/Traits";
import { UnitEvent, } from "../UnitEvents";
import { getCardDefinition } from "./Card";

// A Unit holds data about a game character
// It is created based on a card "spec"
export type Unit = {
  id: string;
  cardId: string;
  name: string;
  pic: string;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;
  xp: number;

  attackPower: number;
  attackType: "melee" | "ranged" | "none";

  defense: number;
  magicDefense: number;

  cooldown: number;
  crit: number;
  evade: number;

  // Temporary status effects
  statuses: UnitStatusIndex;
  traits: TraitData[];

  log: string[];

  charge: number; // each tick the job's agi is added here. when it reaches 100, the job can act
  refresh: number; // the time it takes for the job to act again. Even if charged, this must be 0

  hasted: number;
  slowed: number;
};

export type UnitStatusIndex = {
  [key: string]: {
    effect: UnitEvent,
    onEnd: UnitEvent,
    duration: number;
  }
}

export const makeUnit = (force: string, cardId: string, position = vec2Zero()): Unit => {

  const card = getCardDefinition(cardId);
  const unit = {
    ...card,
    id: v4(),
    cardId,
    force,
    position,
    maxHp: card.hp,
    crit: 0,
    evade: 0,
    xp: 0,
    attackType: card.attack && card.traits.some(k => k.id === "ranged") ? "ranged" :
      card.attack && card.traits.some(t => t.id === "melee") ? "melee" : "none",
    attackPower: card.attack || 0,
    defense: 0,
    magicDefense: 0,
    equip: null,
    log: [],
    statuses: {},
    charge: 0,
    refresh: 0,
    hasted: 0,
    slowed: 0,
    traits: card.traits,
  }
  return unit as Unit
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

