import { ENCOUNTER_BLOBS, parseEncounter } from "../Scenes/Battleground/enemyWaves";
import { pickOne } from "../utils";
import { Item, ITEMS } from "./Item";
import { NECROMANCER, SKELETON, SKELETON_MAGE } from "./Card";
import { Unit } from "./Unit";
import { images } from "../assets";

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

const ENCOUNTER_CRYPT = () => {

	const randomEncounters = [[
		"xxx",
		"xxx",
		"x1x"
	],
	[

		"xxx",
		"2xx",
		"xxx"
	],
	[

		"xxx",
		"3xx",
		"xxx"
	],
	]

	return parseEncounter(pickOne(randomEncounters), { '1': SKELETON, '2': SKELETON_MAGE, '3': NECROMANCER })


};

export const adventures: Record<string, Adventure> = {
	forest_entrance: {
		name: "Forest Entrance",
		icon: images.forest_entrance.key,
		currentWave: 1,
		description: "A dark and gloomy forest entrance.",
		waves: [
			{
				generate: ENCOUNTER_BLOBS,
				icon: "",
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
				icon: "",
				loot: () => ([] as Item[]).concat(
					Math.random() > 0.3 ? [ITEMS.TOXIC_POTION_COMMON()] : []
				)

			},
		]
	},
	crypts: {
		name: "Crypts",
		icon: "charas/skeleton",
		currentWave: 1,
		description: "A dark and gloomy crypt.",
		waves: [
			{
				generate: ENCOUNTER_CRYPT,
			},
			{
				generate: ENCOUNTER_CRYPT,
				icon: "",
				loot: () => ([] as Item[]).concat(
					Math.random() > 0.3 ? [ITEMS.TOXIC_POTION_COMMON()] : []
				)
			},
		]
	}
}

