export type SkillId = string & { __skillId: never };

export type Skill = {
	id: SkillId;
	name: string;
	tooltip: string;
};

const skill = (
	id: string,
	name: string,
	tooltip: string,
): Skill => ({
	id: id as SkillId,
	name,
	tooltip,
});

export const SLASH = "slash" as SkillId;
export const HEAL = "heal" as SkillId;
export const SHOOT = "shoot" as SkillId;
export const FIREBALL = "fireball" as SkillId;
export const SHIELDBASH = "shieldbash" as SkillId;
export const SUMMON = "summon" as SkillId;
export const MULTISHOT = "multishot" as SkillId;
export const HEALING_WAVE = "healing-wave" as SkillId;
export const FEINT = "feint" as SkillId;
export const LIGHT_ORB = "light-orb" as SkillId;
export const ARCANE_MISSILES = "arcane-missiles" as SkillId;
export const EXPLODE = "explode" as SkillId;
export const SHADOWSTEP = "shadowstep" as SkillId;
export const HASTE = "haste" as SkillId;
export const FROST_BOLT = 'frost_bolt' as SkillId;

const skills = `
id                     | name            | tooltip
-----------------------|-----------------|----------------------------------------------
${SLASH}               | Slash           | Attack with a sword
${HEAL}                | Heal            | Heals an ally unit for 50 HP
${SHOOT}               | Shoot           | Shoots an arrow
${FIREBALL}            | Fireball        | Deals 80 damage to the target and 40 damage enemies around it
${SHIELDBASH}          | Shield Bash     | Deals damage and stuns the enemy for 1 turn
${SUMMON}              | Summon          | Summons a unit
${MULTISHOT}           | Multishot       | Shoots 4 arrows
${HEALING_WAVE}        | Healing Wave    | Heals 4 allied units for 20 HP
${LIGHT_ORB}           | Light Orb       | Deals 10 damage to an enemy unit and heals 5 HP to close allies
${ARCANE_MISSILES}     | Arcane Missiles | Deals 10 damage to 3 random enemy targets
${EXPLODE}             | Explode         | Deals 100 damage around the caster
${HASTE}               | Haste           | Surrounding allies are hasted for 2.0s
${FROST_BOLT}          | Frost Bolt      | Damages enemy by 10 and slows for 2s
`.trim()
	.split("\n")
	.slice(2)
	.map(row => row.split("|").map(x => x.trim()))
	.map(row => {
		const [id, name, tooltip] = row;
		return skill(id, name, tooltip);
	});

export const getSkill = (id: SkillId): Skill =>
	skills.find(skill => skill.id === id)!


