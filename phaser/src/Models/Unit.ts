import { asVec2, Vec2 } from "./Geometry";
import { Item } from "./Item";
import { getJob, getMulticast, JobId } from "./Job";
import { getTrait, Trait } from "./Traits";
import { UnitEvents, UNIT_EVENTS } from "./UnitEvents";

export type Unit = {
  id: string;
  name: string;
  job: JobId;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;

  attack: number;
  defense: number;
  agility: number;
  crit: number;
  multicast: number;

  statuses: { [key: string]: number };
  traits: Trait[];

  equip: Item | null;

  log: string[];
  events: UnitEvents
};

export const makeUnit = (id: string, force: string, jobId: JobId, position: Vec2): Unit => {

  const job = getJob(jobId);
  const jobTraits = job.traits.map(getTrait());
  console.log(jobTraits)
  const unit = {
    ...job,
    id,
    job: jobId,
    force,
    position: asVec2(position),
    maxHp: job.hp,
    multicast: getMulticast(job.id),
    crit: job.agility * 1.5,
    equip: null,
    log: [],
    statuses: {},
    traits: jobTraits,
    events: UNIT_EVENTS.reduce((acc, event) => {
      acc[event] = [];

      // Traits that have triggers for the current event (onTurnStart, onTurnEnd, etc)
      const matchingTraits = jobTraits.filter(t => t.events[event])

      if (matchingTraits.length > 0) {
        matchingTraits.forEach((trait) => {
          const traitEvents = trait.events[event];
          if (traitEvents) {
            // the type system doesn't know that the trait event will be of the same type
            //@ts-ignore
            acc[event].push(...traitEvents);
          }
        });
      }

      // if (job.traits[event]) {
      // }
      return acc;
    }, {} as UnitEvents),
  } as Unit;
  return unit
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

