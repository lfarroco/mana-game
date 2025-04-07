import { asVec2, Vec2 } from "./Geometry";
import { getJob, JobId } from "./Job";
import { TraitId } from "./Traits";

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
  traits: TraitId[];

  log: string[];
};

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
    multicast: 2,
    crit: job_.agility * 1.5,
    log: [],
    statuses: {},
    traits: [],
  } as Unit;
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

