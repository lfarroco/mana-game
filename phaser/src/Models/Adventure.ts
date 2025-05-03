import { ENCOUNTER_BLOBS } from "../Scenes/Battleground/enemyWaves";
import { Unit } from "./Unit";

export type Adventure = {
	name: string;
	icon: string;
	description: string;
	waves: Wave[]
	currentWave: number;
}

export type Wave = {
	generate: () => Unit[];
	icon: string | null;
}

export const adventures: Record<string, Adventure> = {
	forest_entrance: {
		name: "Forest Entrance",
		icon: "forest_entrance",
		currentWave: 0,
		description: "A dark and gloomy forest entrance.",
		waves: [
			{
				generate: ENCOUNTER_BLOBS,
				icon: "ui/chest",
			},
			{
				generate: ENCOUNTER_BLOBS,
				icon: null,
			},
			{
				generate: ENCOUNTER_BLOBS,
				icon: "ui/chest",
			},
			{
				generate: ENCOUNTER_BLOBS,
				icon: null,
			},
			{
				generate: ENCOUNTER_BLOBS,
				icon: "ui/chest",
			},
		]
	},
}
