import * as s from "./Skill";
import * as t from "./Traits";

export type JobId = string & { __jobId: true };

export type Job = {
  id: JobId;
  name: string;
  description: string;
  upgrades: JobId[];
  hp: number;
  attack: number;
  defense: number;
  agility: number;
  skill: s.SkillId;
  traits: t.TraitId[]
};

export const ARCHER = "archer" as JobId;
export const CLERIC = "cleric" as JobId;
export const APPRENTICE = "apprentice" as JobId;
export const KNIGHT = "knight" as JobId;
export const THIEF = "thief" as JobId;
export const DRUID = "druid" as JobId;
export const BARBARIAN = "barbarian" as JobId;
export const PIRATE = "pirate" as JobId;
export const PALADIN = "paladin" as JobId;
export const RANGER = "ranger" as JobId;
export const NECROMANCER = "necromancer" as JobId;
export const BARD = "bard" as JobId;

const STARTER_JOBS = [ARCHER, CLERIC, APPRENTICE, KNIGHT, THIEF, DRUID, BARBARIAN, PIRATE, PALADIN, RANGER, NECROMANCER, BARD];

const baseJobs = `
Job           | Name        | HP  | ATK  | AGI   | Skill                | Traits
--------------|-------------|-----|------|-------|--------------------------------------
${ARCHER}     | Archer      | 150 | 25   |  1200 | ${s.SHOOT}           | ${t.SNIPER.id}
${CLERIC}     | Cleric      | 180 | 12   |  2000 | ${s.HEALING_WAVE}    |
${APPRENTICE} | Apprentice  | 180 | 20   |  2200 | ${s.ARCANE_MISSILES} | ${t.SPLASH.id}
${KNIGHT}     | Knight      | 220 | 17   |  1800 | ${s.SLASH}           | ${t.TAUNT.id}, ${t.PROTECTOR.id}
${THIEF}      | Thief       | 140 | 28   |  1400 | ${s.SLASH}           | ${t.STEALTH.id},${t.ASSASSIN.id}
${DRUID}      | Druid       | 200 | 15   |  1000 | ${s.SLASH}           |
${BARBARIAN}  | Barbarian   | 250 | 30   |  1000 | ${s.SLASH}           | ${t.BERSERK.id}
${PIRATE}     | Pirate      | 200 | 20   |  1000 | ${s.SLASH}           |
${PALADIN}    | Paladin     | 250 | 20   |  1000 | ${s.SLASH}           | ${t.TAUNT.id}, ${t.PROTECTOR.id}
${RANGER}     | Ranger      | 250 | 20   |  1000 | ${s.SHOOT}           | 
${NECROMANCER}| Necromancer | 250 | 20   |  1000 | ${s.ARCANE_MISSILES} | ${t.UNDEAD_STRENGTH.id}
${BARD}       | Bard        | 250 | 20   |  1000 | ${s.SLASH}           |
`;

export const BLOB = "blob" as JobId;
export const RED_BLOB = "red_blob" as JobId;
export const BLOB_KING = "blob_king" as JobId;
export const BLOB_MAGE = "blob_mage" as JobId;
export const BLOB_KNIGHT = "blob_knight" as JobId;
export const TINY_BLOB = "tiny_blob" as JobId;
export const SKELETON = "skeleton" as JobId;
export const SKELETON_MAGE = "skeleton_mage" as JobId;

const monsters = `
Job              | Name         | HP  | ATK | AGI  | Skill                | Traits
-----------------|--------------|-----|-----|------|----------------------|---------------
${BLOB}          | Blob         | 40  | 20  | 2000 | ${s.SLASH}           | ${t.SPLIT_BLOB.id}
${RED_BLOB}      | Red Blob     | 40  | 20  | 2000 | ${s.EXPLODE}         | ${t.BURN.id}, ${t.SPLIT_BLOB.id}
${BLOB_KING}     | Blob King    | 500 | 50  | 2000 | ${s.SLASH}           | ${t.SPLIT_BLOB.id}
${BLOB_MAGE}     | Blob Mage    | 90  | 15  | 2000 | ${s.ARCANE_MISSILES} | ${t.SPLIT_BLOB.id}
${BLOB_KNIGHT}   | Blob Knight  | 400 | 25  | 2000 | ${s.SLASH}           | ${t.TAUNT.id}
${TINY_BLOB}     | Tiny Blob    | 20  | 10  | 2000 | ${s.SLASH}           |
${SKELETON}      | Skeleton     | 50  | 10  | 2000 | ${s.SLASH}           | ${t.UNDEAD.id},${t.REBORN.id}
${SKELETON_MAGE} | Skeleton Mage| 80  | 5   | 2000 | ${s.ARCANE_MISSILES} | ${t.UNDEAD.id},${t.REBORN.id}
`

function parseJobsTable(table: string) {
  const rows = table.trim().split("\n").map((r) => r.trim());
  const header = rows[0].split("|").map((h) => h.trim());
  const data = rows.slice(2).map((r) => {
    const cells = r.split("|").map((c) => c.trim());
    return header.reduce((acc, h, i) => {
      acc[h] = cells[i];
      return acc;
    }, {} as { [key: string]: string });
  });

  return data.map((d) => {
    return {
      id: d["Job"] as JobId,
      name: d["Name"],
      description: "",
      hp: parseInt(d["HP"]),
      attack: parseInt(d["ATK"]),
      defense: 0,
      agility: parseInt(d["AGI"]),
      skill: d["Skill"] as s.SkillId,
      traits: d["Traits"]?.split(",").map((t) => t.trim() as t.TraitId).filter(t => t) || [],
    } as Job;
  })
}

export const descriptions = `
Job           | Description
--------------|--------------------------------------
${ARCHER}     | A ranged attacker that can hit multiple targets
${CLERIC}     | A healer that can heal multiple targets
${APPRENTICE} | A spellcaster that can deal high damage
${KNIGHT}     | A tank that can take a lot of damage
${THIEF}      | A fast attacker that can deal high damage
${BLOB}       | A basic enemy that can deal damage
${RED_BLOB}   | A basic enemy that can explode
${BLOB_KING}  | A boss enemy that can summon other blobs
${BLOB_MAGE}  | A mage enemy that can deal high damage
${BLOB_KNIGHT}| A tank enemy that can deal damage
`;


const descriptionsMap = descriptions.trim().split("\n").slice(2).map((r) => {
  const [id, description] = r.split("|").map((c) => c.trim());
  return { id, description };
}).reduce((acc, { id, description }) => {
  acc[id] = description;
  return acc;
}
  , {} as { [key: string]: string });

function getDesctiption(job: Job): Job {
  job.description = descriptionsMap[job.id];
  return job;
}
export const jobs = parseJobsTable(baseJobs).concat(parseJobsTable(monsters)).map(getDesctiption);

export const starterJobs = jobs.filter((j) => STARTER_JOBS.includes(j.id));

export const getJob = (id: JobId): Job => jobs.find((j) => j.id === id)!;