
export type Skill = {
	id: string;
	name: string;
	range: number;
	cooldown: number;
	power: number;
	tooltip: string;
};
// idea: have property "effects" that is an array of strings, each string is the name of some special effect

export const skills: Skill[] = [
	{
		id: "slash",
		name: "Slash",
		cooldown: 0,
		range: 1,
		power: 20,
		tooltip: "Attack with a sword",
	},
	{
		id: "heal",
		name: "Heal",
		cooldown: 2,
		range: 5,
		power: 20,
		tooltip: "Heals an ally unit for 5 HP each turn",
	},
	{
		id: "shoot",
		name: "Shoot",
		cooldown: 0,
		range: 4,
		power: 20,
		tooltip: "Shoots an arrow",
	},
	{
		id: "fireball",
		name: "Fireball",
		cooldown: 3,
		range: 5,
		power: 100,
		tooltip: "Deals 10 damage to an enemy unit",
	},
	{
		id: "shieldbash",
		name: "Shield Bash",
		cooldown: 3,
		range: 1,
		power: 20,
		tooltip: "Deals damage and stuns the enemy for 1 turn",
	},
	{
		id: "summon_blob",
		name: "Summon Blobs",
		cooldown: 3,
		range: 1,
		power: 20,
		tooltip: "Summons 4 blobs",
	},
	{
		id: "multishot",
		name: "Multishot",
		cooldown: 4,
		range: 5,
		power: 20,
		tooltip: "Shoots 4 arrows",
	},
	{
		id: "healingwave",
		name: "Healing Wave",
		cooldown: 3,
		range: 5,
		power: 20,
		tooltip: "Heals 3 ally units for 50 HP",
	}
]

// ideas for skills:
//- fire pillar

export const getSkill = (id: string): Skill => {

	return skills.find(skill => skill.id === id)!

}