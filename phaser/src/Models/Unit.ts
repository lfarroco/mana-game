import { v4 } from "uuid";
import { asVec2, Vec2 } from "./Geometry";
import { Item } from "./Item";
import { getJob, JobId } from "./Job";
import { SHOOT, SLASH } from "./Skill";
import { getTrait, Trait } from "./Traits";
import { UnitEvent, UnitEvents, UNIT_EVENTS } from "./UnitEvents";

export type Unit = {
  id: string;
  name: string;
  job: JobId;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;

  attackPower: number;
  attackType: "melee" | "ranged" | "magic";

  defense: number;
  magicDefense: number;

  agility: number;
  crit: number;
  evade: number;

  // Temporary status effects
  statuses: UnitStatusIndex;
  traits: Trait[];

  equip: Item | null;

  log: string[];
  events: UnitEvents
};

export type UnitStatusIndex = {
  [key: string]: {
    effect: UnitEvent,
    onEnd: UnitEvent,
    duration: number;
  }
}


export const makeUnit = (force: string, jobId: JobId, position: Vec2): Unit => {

  const job = getJob(jobId);
  const jobTraits = job.traits.map(getTrait());
  const unit = {
    ...job,
    id: v4(),
    job: jobId,
    force,
    position: asVec2(position),
    maxHp: job.hp,
    crit: job.agility * 1.5,
    evade: 0,
    attackType: job.skill === SLASH ? "melee" : job.skill === SHOOT ? "ranged" : "magic",
    attackPower: job.attack,
    defense: 0,
    magicDefense: 0,
    equip: null,
    log: [],
    statuses: {},
    traits: jobTraits,
    events: UNIT_EVENTS.reduce((eventsIndex, event) => {
      eventsIndex[event] = [];

      // Traits that have triggers for the current event (onTurnStart, onTurnEnd, etc)
      const matchingTraits = jobTraits.filter(t => t.events[event])

      if (matchingTraits.length > 0) {
        matchingTraits.forEach((trait) => {
          const traitEvents = trait.events[event];
          if (traitEvents) {
            // the type system doesn't know that the trait event will be of the same type
            //@ts-ignore
            eventsIndex[event].push(...traitEvents);
          }
        });
      }

      return eventsIndex;
    }, {} as UnitEvents),
  } as Unit;
  return unit
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

