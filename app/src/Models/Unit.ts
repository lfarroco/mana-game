import { asVec2, Vec2 } from "./Geometry";
import { getJob } from "./Job";
import { getSkill } from "./Skill";

export type Unit = {
  id: string;
  name: string;
  job: string;
  force: string;
  position: Vec2;
  initialPosition: Vec2;

  hp: number;
  maxHp: number;

  cooldowns: { [key: string]: number };
  statuses: { [key: string]: number };

  attack: number;
  defense: number;
  accuracy: number;
  agility: number;
  log: string[];
};

export const makeUnit = (id: string, force: string, job: string, position: Vec2): Unit => {

  const job_ = getJob(job);
  return {
    ...job_,
    id,
    job,
    force,
    position: asVec2(position),
    initialPosition: position,
    maxHp: job_.hp,
    log: [],
    cooldowns: job_.skills.reduce((acc, skillId) => {
      const skill = getSkill(skillId)
      acc[skillId] = skill.cooldown;
      return acc;
    }, {} as { [key: string]: number }),
    statuses: {},
  } as Unit;
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}