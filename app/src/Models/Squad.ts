import { Vec2, vec2 } from "./Geometry";
import { getJob } from "./Job";

export type SquadStatus = "MOVING" | "ATTACKING" | "DESTROYED" | "IDLE";

export const SQUAD_STATUS: Record<SquadStatus, SquadStatus> = {
  MOVING: "MOVING",
  ATTACKING: "ATTACKING",
  DESTROYED: "DESTROYED",
  IDLE: "IDLE",
};

export type Unit = {
  path: Vec2[];
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;
  status: SquadStatus;
  movementIndex: number;

  // stats
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
    status: SQUAD_STATUS.IDLE,
    movementIndex: 0,
    ...job_.stats,
    maxHp: job_.stats.hp,
  };
};

