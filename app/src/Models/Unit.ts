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
    id,
    name: job_.name,
    job,
    force,
    position: asVec2(position),
    initialPosition: position,
    ...job_.stats,
    maxHp: job_.stats.hp,
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