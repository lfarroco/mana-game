import { Vec2 } from "./Geometry";
import { getJob } from "./Job";

export type UnitStatus =
  { type: "MOVING", target: Vec2 }
  | { type: "ATTACKING", target: string }
  | { type: "DESTROYED" }
  | { type: "IDLE" };

export const UNIT_STATUS_KEYS: { [key: string]: UnitStatus["type"] } = {
  MOVING: "MOVING",
  ATTACKING: "ATTACKING",
  DESTROYED: "DESTROYED",
  IDLE: "IDLE",
};

export const UNIT_STATUS_LABELS: { [key: string]: string } = {
  MOVING: "Moving",
  ATTACKING: "Attacking",
  DESTROYED: "Destroyed",
  IDLE: "Idle",
};

// TODO: use this helpers instead of the type guards
export const isAttacking = (status: UnitStatus): status is { type: "ATTACKING", target: string } => status.type === UNIT_STATUS_KEYS.ATTACKING;
export const isMoving = (status: UnitStatus): status is { type: "MOVING", target: Vec2 } => status.type === UNIT_STATUS_KEYS.MOVING;
export const isDestroyed = (status: UnitStatus): status is { type: "DESTROYED" } => status.type === UNIT_STATUS_KEYS.DESTROYED;
export const isIdle = (status: UnitStatus): status is { type: "IDLE" } => status.type === UNIT_STATUS_KEYS.IDLE;

export const MOVING = (target: Vec2): UnitStatus => ({ type: UNIT_STATUS_KEYS.MOVING, target } as UnitStatus);
export const ATTACKING = (target: string): UnitStatus => ({ type: UNIT_STATUS_KEYS.ATTACKING, target } as UnitStatus);
export const DESTROYED = (): UnitStatus => ({ type: UNIT_STATUS_KEYS.DESTROYED } as UnitStatus);
export const IDLE = (): UnitStatus => ({ type: UNIT_STATUS_KEYS.IDLE } as UnitStatus);

export const UNIT_STATUS = {
  MOVING,
  ATTACKING,
  DESTROYED,
  IDLE,
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
    status: UNIT_STATUS.IDLE(),
    movementIndex: 0,
    ...job_.stats,
    maxHp: job_.stats.hp,
  };
};
