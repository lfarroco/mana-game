


export type Skill = {
	id: string;
	name: string;
	range: number;
	targets: ("enemy" | "ally" | "unit" | "tile")[]
	power: number;
	mana: number;
	harmful: boolean;
};