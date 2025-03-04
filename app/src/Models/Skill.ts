
export type Skill = {
	id: string;
	name: string;
	range: number;
	cooldown: number;
	targets: "enemy" | "ally" | "unit" | "tile"
	power: number;
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
		cooldown: 0,
		range: 1,
		targets: "enemy",
		power: 20,
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
		cooldown: 2,
		range: 2,
		targets: "ally",
		power: 20,
		harmful: false,
		areaOfEffect: 1,
		tooltip: "Heals an ally unit for 5 HP each turn",
		emote: "magic-emote",
		targetEffect: "cethiel_light",
		projectile: null,
		targetingLogic: "most-hurted-ally",
	},
	{
		id: "shoot",
		name: "Shoot",
		cooldown: 0,
		range: 4,
		targets: "enemy",
		power: 20,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Shoots an arrow",
		emote: "magic-emote",
		targetEffect: "cethiel-slash",
		projectile: "arrow",
		targetingLogic: "closest-enemy",
	},
	{
		id: "fireball",
		name: "Fireball",
		cooldown: 3,
		range: 5,
		targets: "enemy",
		power: 100,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Deals 10 damage to an enemy unit",
		emote: "magic-emote",
		targetEffect: "cethiel_light",
		projectile: null,
		targetingLogic: "closest-enemy",
	},
	{
		id: "shieldbash",
		name: "Shield Bash",
		cooldown: 3,
		range: 1,
		targets: "enemy",
		power: 20,
		harmful: true,
		areaOfEffect: 1,
		tooltip: "Deals damage and stuns the enemy for 1 turn",
		emote: "magic-emote",
		targetEffect: "cethiel_light",
		projectile: null,
		targetingLogic: "closest-enemy",
	},
]

// ideas for skills:
//- fire pillar

export const getSkill = (id: string): Skill => {

	return skills.find(skill => skill.id === id)!

}