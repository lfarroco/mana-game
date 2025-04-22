import { asVec2, Vec2 } from "./Geometry";
import { Item } from "./Item";
import { getJob, getMulticast, JobId } from "./Job";
import { Trait } from "./Traits";

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

export type IO = () => Promise<void>;
export type UnitEvent = ((u: Unit) => IO);
type UnitEventWithTarget = ((u: Unit, target: Unit) => IO);

export type UnitEvents = {
  onTurnStart: UnitEvent[];
  onTurnEnd: UnitEvent[];
  onBattleStart: UnitEvent[];
  onBattleEnd: UnitEvent[];
  onAttackByMe: UnitEventWithTarget[];
  onDefendByMe: UnitEventWithTarget[];
  onUnitKillByMe: UnitEventWithTarget[];
  onUnitKill: UnitEventWithTarget[];
  onAlliedKilled: UnitEventWithTarget[];
  onEnemyKilled: UnitEventWithTarget[];
  onSelfEliminated: UnitEventWithTarget[];
}

export const UNIT_EVENTS: Array<keyof UnitEvents> = [
  "onTurnStart",
  "onTurnEnd",
  "onBattleStart",
  "onBattleEnd",
  "onAttackByMe",
  "onDefendByMe",
  "onUnitKillByMe",
  "onUnitKill",
  "onAlliedKilled",
  "onEnemyKilled",
  "onSelfEliminated",
];

export const makeUnit = (id: string, force: string, job: JobId, position: Vec2): Unit => {

  const jobId = job as JobId;
  const job_ = getJob(jobId);
  return {
    ...job_,
    id,
    job: jobId,
    force,
    position: asVec2(position),
    maxHp: job_.hp,
    multicast: getMulticast(job_.id),
    crit: job_.agility * 1.5,
    equip: null,
    log: [],
    statuses: {},
    traits: [],
    events: UNIT_EVENTS.reduce((acc, event) => {
      acc[event] = [];
      return acc;
    }, {} as UnitEvents) as UnitEvents,
  } as Unit;
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

