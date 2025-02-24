import { Vec2 } from "./Geometry";
import { getJob } from "./Job";

export type Unit = {
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;
  initialPosition: Vec2;

  hp: number;
  maxHp: number;

  attack: number;
  defense: number;
  mgkAttack: number;
  mgkDefense: number;
  accuracy: number;
  agility: number;
  log: string[];
};

export const makeUnit = (id: string, force: string, job: string, position: Vec2): Unit => {

  const job_ = getJob(job);
  return {
    id,
    name: job_.name,
    job,
    force,
    position,
    initialPosition: position,
    ...job_.stats,
    maxHp: job_.stats.hp,
    log: [],
  };
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}