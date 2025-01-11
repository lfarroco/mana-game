import { Vec2 } from "./Geometry";
import { getJob } from "./Job";

export type Unit = {
  path: Vec2[];
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;

  hp: number;
  maxHp: number;

  mana: number;
  maxMana: number;

  attack: number;
  defense: number;
  mgkAttack: number;
  mgkDefense: number;
  accuracy: number;
  agility: number;
};

export const makeUnit = (id: string, force: string, job: string, position: Vec2): Unit => {

  const job_ = getJob(job);
  return {
    id,
    name: job_.name,
    job,
    force,
    position,
    path: [],
    ...job_.stats,
    maxHp: job_.stats.hp,
    maxMana: job_.stats.mana,
  };
};
