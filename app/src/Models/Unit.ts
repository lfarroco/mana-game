import { asVec2, Vec2 } from "./Geometry";
import { getJob, JobId } from "./Job";
import { getSkill, SkillId } from "./Skill";

export type Unit = {
  id: string;
  name: string;
  job: JobId;
  force: string;
  position: Vec2;
  initialPosition: Vec2;

  hp: number;
  maxHp: number;

  attack: number;
  defense: number;
  agility: number;

  cooldowns: { [key: SkillId]: number };
  statuses: { [key: string]: number };

  learnedSkills: SkillId[];

  log: string[];
};

export const makeUnit = (id: string, force: string, job: JobId, position: Vec2): Unit => {

  const jobId = job as JobId;
  const job_ = getJob(jobId);
  const learnedSkills = [job_.baseSkill];
  return {
    ...job_,
    id,
    job: jobId,
    force,
    position: asVec2(position),
    initialPosition: position,
    maxHp: job_.hp,
    log: [],
    cooldowns: learnedSkills.reduce((acc, skillId) => {
      const skill = getSkill(skillId)
      acc[skillId] = skill.cooldown;
      return acc;
    }, {} as { [key: string]: number }),
    statuses: {},
    learnedSkills
  } as Unit;
};

export const unitLog = (unit: Unit, log: string) => {
  unit.log = [log, ...unit.log];
  console.log(unit.id, log);
}

