
export type SkillId = string & { __skillId: never };

export type Skill = {
	id: SkillId;
	name: string;
	pic: string;
	range: number;
	cooldown: number;
	power: number;
	tooltip: string;
};

const skill = (
	id: string,
	name: string,
	range: number,
	cooldown: number,
	power: number,
	tooltip: string,
): Skill => ({
	id: id as SkillId,
	name,
	pic: "icon/fireball",
	range,
	cooldown,
	power,
	tooltip,
});

export const SLASH = "slash" as SkillId;
export const HEAL = "heal" as SkillId;
export const SHOOT = "shoot" as SkillId;
export const FIREBALL = "fireball" as SkillId;
export const SHIELDBASH = "shieldbash" as SkillId;
export const SUMMON_BLOB = "summon_blob" as SkillId;
export const MULTISHOT = "multishot" as SkillId;
export const HEALING_WAVE = "healing-wave" as SkillId;
export const FEINT = "feint" as SkillId;
export const LIGHT_ORB = "light-orb" as SkillId;
export const ARCANE_MISSILES = "arcane-missiles" as SkillId;
export const EXPLODE = "explode" as SkillId;
export const SHADOWSTEP = "shadowstep" as SkillId;
export const SONG = "song" as SkillId;

const skills = `
id                | name            | range | cooldown | power | tooltip
------------------|-----------------|-------|----------|-------|----------------------------------------------
${SLASH}          | Slash           | 1     | 0        | 20    | Attack with a sword
${HEAL}           | Heal            | 5     | 2        | 50    | Heals an ally unit for 50 HP
${SHOOT}          | Shoot           | 4     | 0        | 20    | Shoots an arrow
${FIREBALL}       | Fireball        | 5     | 3        | 80    | Deals 80 damage to the target and 40 damage enemies around it
${SHIELDBASH}     | Shield Bash     | 1     | 3        | 20    | Deals damage and stuns the enemy for 1 turn
${SUMMON_BLOB}    | Summon Blobs    | 1     | 3        | 20    | Summons 4 blobs
${MULTISHOT}      | Multishot       | 5     | 4        | 20    | Shoots 4 arrows
${HEALING_WAVE}   | Healing Wave    | 5     | 3        | 50    | Heals 4 allied units for 50 HP
${FEINT}          | Feint           | 1     | 2        | 20    | Dodges the next attack and deals a critical
${LIGHT_ORB}      | Light Orb       | 5     | 0        | 10    | Deals 10 damage to an enemy unit and heals 5 HP to close allies
${ARCANE_MISSILES}| Arcane Missiles | 5     | 0        | 10    | Deals 10 damage to 3 random enemy targets
${EXPLODE}        | Explode         | 1     | 0        | 100   | Deals 100 damage around the caster
${SHADOWSTEP}     | Shadowstep      | 5     | 0        | 0     | If no enemy is nearby, teleports to the furthest enemy
${SONG}           | Song            | 5     | 0        | 0     | Surrounding allies are hasted for 2.0s
`.trim()
	.split("\n")
	.slice(2)
	.map(row => row.split("|").map(x => x.trim()))
	.map(row => {
		const [id, name, range, cooldown, power, tooltip] = row;
		return skill(id, name, parseInt(range), parseInt(cooldown), parseInt(power), tooltip);
	});

export const getSkill = (id: SkillId): Skill =>
	skills.find(skill => skill.id === id)!


