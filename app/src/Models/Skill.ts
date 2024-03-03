
export type Skill = {
	id: string;
	name: string;
	range: number;
	targets: "enemy" | "ally" | "unit" | "tile"
	power: number;
	mana: number;
	harmful: boolean;
	areaOfEffect: number;
	tooltip: string;
};

export const skills: Skill[] = [
	{
		id: "heal",
		name: "Heal",
		range: 3,
		targets: "ally",
		power: 5,
		mana: 5,
		harmful: false,
		areaOfEffect: 1,
		tooltip: "Heals an ally unit for 5 HP each turn"
	},
	{
		id: "fireball",
		name: "Fireball",
		range: 5,
		targets: "enemy",
		power: 10,
		mana: 10,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Deals 10 damage to an enemy unit"
	},
	{
		id: "lightning",
		name: "Lightning",
		range: 5,
		targets: "enemy",
		power: 15,
		mana: 15,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Deals 15 damage to an enemy unit"
	},
	{
		id: "freeze",
		name: "Freeze",
		range: 5,
		targets: "enemy",
		power: 0,
		mana: 20,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Freezes an enemy unit for 1 turn"
	},
	{
		id: "poison",
		name: "Poison",
		range: 5,
		targets: "enemy",
		power: 5,
		mana: 5,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Poisons an enemy unit for 5 damage each turn"
	},
	{
		id: "teleport",
		name: "Teleport",
		range: 5,
		targets: "tile",
		power: 0,
		mana: 20,
		harmful: false,
		areaOfEffect: 1,
		tooltip: "Teleports the caster to a different location"
	},

]

export const getSkill = (id: string): Skill => {

	return skills.find(skill => skill.id === id)!

}