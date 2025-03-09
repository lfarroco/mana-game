
export type Skill = {
	id: string;
	name: string;
	range: number;
	cooldown: number;
	power: number;
	tooltip: string;
};

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
		tooltip: "Heals 4 allied units for 50 HP",
	},
	{
		id: "feint",
		name: "Feint",
		cooldown: 2,
		range: 1,
		power: 20,
		tooltip: "Dodges the next attack and deals a critical",
	}, {
		id: "light-orb",
		name: "Light Orb",
		cooldown: 0,
		range: 5,
		power: 10,
		tooltip: "Deals 10 damage to an enemy unit and heals 5 HP to close allies",
	}, {
		id: "arcane-missiles",
		name: "Arcane Missiles",
		cooldown: 0,
		range: 5,
		power: 20,
		tooltip: "Deals 20 damage 3 random enemy targets",
	}
]

// ideas for skills:
//- fire pillar

export const getSkill = (id: string): Skill => {

	return skills.find(skill => skill.id === id)!

}