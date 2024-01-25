import { Vec2, vec2 } from "./Geometry";
import { getJob } from "./Job";

export type UnitStatus = { type: "MOVING", target: Vec2 } | { type: "ATTACKING", target: string } | { type: "DESTROYED" } | { type: "IDLE" };

export const UNIT_STATUS: { [key: string]: UnitStatus } = {
  MOVING: { type: "MOVING", target: vec2(0, 0) },
  ATTACKING: { type: "ATTACKING", target: "" },
  DESTROYED: { type: "DESTROYED" },
  IDLE: { type: "IDLE" },
};

export type Unit = {
  path: Vec2[];
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;
  status: UnitStatus;
  movementIndex: number;

  hp: number;
  maxHp: number;
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
    status: UNIT_STATUS.IDLE,
    movementIndex: 0,
    ...job_.stats,
    maxHp: job_.stats.hp,
  };
};

