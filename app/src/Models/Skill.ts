
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
	emote: string | null;
	targetEffect: string | null;
	projectile: string | null;
	targetingLogic: "closest-enemy" | "most-hurted-ally";
};
// idea: have property "effects" that is an array of strings, each string is the name of some special effect

export const skills: Skill[] = [
	{
		id: "slash",
		name: "Slash",
		range: 1,
		targets: "enemy",
		power: 20,
		mana: 0,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Attack with a sword",
		emote: "magic-emote",
		targetEffect: "cethiel-slash",
		projectile: null,
		targetingLogic: "closest-enemy",
	},
	{
		id: "heal",
		name: "Heal",
		range: 2,
		targets: "ally",
		power: 20,
		mana: 5,
		harmful: false,
		areaOfEffect: 1,
		tooltip: "Heals an ally unit for 5 HP each turn",
		emote: "magic-emote",
		targetEffect: "cethiel_light",
		projectile: null,
		targetingLogic: "most-hurted-ally",
	},
	{
		id: "fireball",
		name: "Fireball",
		range: 5,
		targets: "enemy",
		power: 100,
		mana: 10,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Deals 10 damage to an enemy unit",
		emote: "magic-emote",
		targetEffect: "cethiel_light",
		projectile: null,
		targetingLogic: "closest-enemy",
	},
]

export const getSkill = (id: string): Skill => {

	return skills.find(skill => skill.id === id)!

}