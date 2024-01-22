import { Vec2, vec2 } from "./Geometry";
import { getJob } from "./Job";

export type UnitStatus = "MOVING" | "ATTACKING" | "DESTROYED" | "IDLE";

export const UNIT_STATUS: Record<UnitStatus, UnitStatus> = {
  MOVING: "MOVING",
  ATTACKING: "ATTACKING",
  DESTROYED: "DESTROYED",
  IDLE: "IDLE",
};

type Order =
  { type: "move_to", target: Vec2 } |
  { type: "attack_move", target: Vec2 } |
  { type: "attack_unit", target: string } |
  { type: "idle" }

export type Unit = {
  path: Vec2[];
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;
  status: UnitStatus;
  movementIndex: number;
  order: Order;

  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  mgkAttack: number;
  mgkDefense: number;
  accuracy: number;
  agility: number;
};

export const makeUnit = (id: string, force: string, job: string): Unit => {

  const job_ = getJob(job);
  return {
    id,
    name: job_.name,
    job,
    force,
    position: vec2(0, 0),
    path: [],
    order: { type: "idle" },
    status: UNIT_STATUS.IDLE,
    movementIndex: 0,
    ...job_.stats,
    maxHp: job_.stats.hp,
  };
};

