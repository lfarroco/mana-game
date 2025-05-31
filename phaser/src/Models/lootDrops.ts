import { getItem, Item } from "./Item";
import { BLOB, CardId, SKELETON, SKELETON_MAGE } from "./Card";

type LootTable = [string, number][]

export const LOOT_DROPS: { [id: string]: LootTable } = {};

LOOT_DROPS[BLOB] = [
	["GOLD_RING", 0.2],
	["imagesRED_POTION.", 0.7],
];
LOOT_DROPS[SKELETON] = [
	["BONE", 0.2],
];
LOOT_DROPS[SKELETON_MAGE] = [
	["BONE", 0.2],
	["MAGIC_WAND", 0.1],
	["MAGIC_DUST", 0.3],
]
// other loots...

const DEFAULT_LOOT: LootTable = []

export const rollLoot = (id: CardId): Item[] => {
	const roll = Math.random();
	const loot = getLootFor(id);

	const filtered = loot.filter(([_key, val]) => {
		return val >= roll;
	}).map(arr => arr[0])

	return filtered.map(getItem)

}

const getLootFor = (id: CardId) => {

	const loot = LOOT_DROPS[id];

	if (!loot) {
		console.warn(`No loot found for ${id}. Returning default loot table (empty).`)
		return DEFAULT_LOOT
	}

	return loot;
}