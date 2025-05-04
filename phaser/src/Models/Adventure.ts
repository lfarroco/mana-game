import { ENCOUNTER_BLOBS } from "../Scenes/Battleground/enemyWaves";
import { Item, ITEMS } from "./Item";
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
	icon?: string;
	loot?: () => Item[];
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
				loot: () => [
					ITEMS.IRON_SWORD_COMMON(),
					ITEMS.TOXIC_POTION_COMMON(),
				].concat(
					Math.random() > 0.3 ? [ITEMS.RED_POTION_COMMON()] : []
				)
			},
			{
				generate: ENCOUNTER_BLOBS,
			},
			{
				generate: ENCOUNTER_BLOBS,
			},
			{
				generate: ENCOUNTER_BLOBS,
			},
			{
				generate: ENCOUNTER_BLOBS,
				icon: "ui/chest",
				loot: () => ([] as Item[]).concat(
					Math.random() > 0.3 ? [ITEMS.TOXIC_POTION_COMMON()] : []
				)

			},
		]
	},
}
