import { v4 } from "uuid";
import { Vec2, vec2Zero } from "./Geometry";
import { getCard } from "./Card";
import { MELEE, RANGED, TraitData, traitSpecs } from "./Traits";
import { UnitEvent, UnitEvents, UNIT_EVENTS } from "./UnitEvents";

export type Unit = {
  id: string;
  name: string;
  job: string;
  pic: string;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;

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
  events: UnitEvents

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

export const makeUnit = (force: string, cardName: string, position = vec2Zero()): Unit => {

  const card = getCard(cardName);
  const unit = {
    ...card,
    id: v4(),
    job: cardName,
    force,
    position,
    maxHp: card.hp,
    crit: 0,
    evade: 0,
    attackType: card.attack && card.traits.some(k => k.id === RANGED.id) ? "ranged" :
      card.attack && card.traits.some(t => t.id === MELEE.id) ? "melee" : "none",
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
    events: UNIT_EVENTS.reduce((eventsIndex, event) => {
      eventsIndex[event] = [];

      // Traits that have triggers for the current event (onTurnStart, onTurnEnd, etc)
      const matchingTraits = card.traits.filter(t => {
        const traitSpec = traitSpecs[t.id];
        return traitSpec && traitSpec.events[event];
      })

      if (matchingTraits.length < 1) return eventsIndex;

      matchingTraits.forEach((trait) => {
        const spec = traitSpecs[trait.id];
        const traitEvents = spec.events[event];
        if (traitEvents) {
          // the type system doesn't know that the trait event will be of the same type
          //@ts-ignore
          eventsIndex[event].push(...traitEvents);
        }
      });

      return eventsIndex;
    }, {} as UnitEvents),
  } as Unit;
  return unit
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

