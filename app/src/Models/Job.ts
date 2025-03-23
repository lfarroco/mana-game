import * as s from "./Skill";

export type JobId = string & { __jobId: true };

export type Job = {
  id: JobId;
  name: string;
  description: string;
  moveRange: number;
  upgrades: JobId[];
  hp: number;
  attack: number;
  defense: number;
  agility: number;
  skills: s.SkillId[];
};

export const ARCHER = "archer" as JobId;
export const ACOLYTE = "acolyte" as JobId;
export const APPRENTICE = "apprentice" as JobId;
export const SQUIRE = "squire" as JobId;
export const THIEF = "thief" as JobId;

const baseJobs = `
Job           | Name        | Range | HP  | ATK  | DEF | AGI | Skills
--------------|-------------|-------|-----|------|-----|-----|--------------------------------------
${ARCHER}     | Archer      | 3     | 100 | 20   | 3   | 16  | ${s.MULTISHOT}, ${s.SHOOT}
${ACOLYTE}    | Acolyte     | 2     | 80  | 10   | 0   | 10  | ${s.HEALING_WAVE}, ${s.LIGHT_ORB}
${APPRENTICE} | Apprentice  | 2     | 80  | 30   | 0   | 8   | ${s.FIREBALL}, ${s.ARCANE_MISSILES}
${SQUIRE}     | Squire      | 3     | 300 | 20   | 5   | 8   | ${s.SHIELDBASH}, ${s.SLASH}
${THIEF}      | Thief       | 4     | 130 | 35   | 2   | 14  | ${s.FEINT}, ${s.SLASH}
`;

export const BLOB = "blob" as JobId;
export const RED_BLOB = "red_blob" as JobId;
export const BLOB_KING = "blob_king" as JobId;
export const BLOB_MAGE = "blob_mage" as JobId;
export const BLOB_KNIGHT = "blob_knight" as JobId;
export const SHADOW_BLOB = "shadow_blob" as JobId;
export const SHADOW_GHOST = "shadow_ghost" as JobId;
export const SWARMLING = "swarmling" as JobId;

const monsters = `
Job             | Name         | Range | HP  | ATK  | DEF | AGI | Skills
----------------|--------------|-------|-----|------|-----|-----|--------------------------------------
${BLOB}         | Blob         | 3     | 40  | 20   | 0   | 10  | ${s.SLASH}
${RED_BLOB}     | Red Blob     | 3     | 40  | 20   | 0   | 10  | ${s.EXPLODE}
${BLOB_KING}    | Blob King    | 2     | 500 | 50   | 3   | 10  | ${s.SUMMON_BLOB}, ${s.SLASH}
${BLOB_MAGE}    | Blob Mage    | 3     | 90  | 15   | 0   | 8   | ${s.FIREBALL}, ${s.ARCANE_MISSILES}
${BLOB_KNIGHT}  | Blob Knight  | 2     | 400 | 25   | 8   | 6   | ${s.SHIELDBASH}, ${s.SLASH}
${SHADOW_BLOB}  | Shadow Blob  | 3     | 900 | 25   | 10  | 6   | ${s.SUMMON_BLOB}
${SHADOW_GHOST} | Shadow Ghost | 4     | 90  | 40   | 0   | 18  | ${s.SHADOWSTEP}, ${s.SLASH}
${SWARMLING}    | Shadowling   | 5     | 120 | 30   | 0   | 20  | ${s.SLASH}
`
// future jobs
// Elementalist  | 2     | 150 | 60   | 5  | 10  | ${s.SHOOT}                           | —                  
// Arcanist      | 2     | 140 | 55   | 5  | 14  | ${s.SHOOT}                           | —                  
// Knight        | 2     | 350 | 50   | 30 | 6   | ${s.SLASH}                           | —                  
// Berserker     | 3     | 300 | 80   | 10 | 10  | ${s.SLASH}                           | —                  
// Sniper        | 3     | 180 | 70   | 5  | 18  | ${s.SHOOT}                           | —                  
// Hunter        | 3     | 170 | 60   | 10 | 14  | ${s.SHOOT}                           | —                  
// Cleric        | 2     | 160 | 40   | 10 | 12  | ${s.SHOOT}                           | —                  
// Monk          | 2     | 180 | 50   | 10 | 10  | ${s.SHOOT}                           | —                  
// Rogue         | 3     | 190 | 60   | 5  | 16  | ${s.SLASH}                           | —                  
// Ninja         | 3     | 180 | 55   | 5  | 22  | ${s.SLASH}                           | —

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
    const skills = d["Skills"].split(",").map((s) => s.trim() as s.SkillId);
    return {
      id: d["Job"] as JobId,
      name: d["Name"],
      description: "",
      moveRange: parseInt(d["Range"]),
      upgrades: [],
      hp: parseInt(d["HP"]),
      attack: parseInt(d["ATK"]),
      defense: parseInt(d["DEF"]),
      agility: parseInt(d["AGI"]),
      skills,
    } as Job;
  })
}


export const descriptions = `
Job           | Description
--------------|--------------------------------------
${ARCHER}     | A ranged attacker that can hit multiple targets
${ACOLYTE}    | A healer that can heal multiple targets
${APPRENTICE} | A spellcaster that can deal high damage
${SQUIRE}     | A tank that can take a lot of damage
${THIEF}      | A fast attacker that can deal high damage
${BLOB}       | A basic enemy that can deal damage
${RED_BLOB}   | A basic enemy that can explode
${BLOB_KING}  | A boss enemy that can summon other blobs
${BLOB_MAGE}  | A mage enemy that can deal high damage
${BLOB_KNIGHT}| A tank enemy that can deal damage
${SHADOW_BLOB}| A shadow enemy that can summon other blobs
${SHADOW_GHOST}| A shadow enemy that can teleport
${SWARMLING}  | A shadow enemy that can deal damage
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

export const getJob = (id: JobId): Job => jobs.find((j) => j.id === id)!;