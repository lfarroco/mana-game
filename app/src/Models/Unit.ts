import { Vec2 } from "./Geometry";
import { getJob } from "./Job";

type UnitOrder = {
  type: "none"
} | {
  type: "move";
  path: Vec2[];
} |
{
  type: "skill";
  skill: string;
  target: Vec2;
};

export type Unit = {
  order: UnitOrder;
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
    order: { type: "none" },
    job,
    force,
    position,
    ...job_.stats,
    maxHp: job_.stats.hp,
    maxMana: job_.stats.mana,
  };
};
