import { fst } from "fp-ts/lib/Tuple";
import { getItem, Item } from "./Item";
import { BLOB, JobId } from "./Job";

type LootTable = [string, number][]

export const LOOT_DROPS: { [id: string]: LootTable } = {};

LOOT_DROPS[BLOB] = [["gold_ring", 0.2], ["red_potion", 0.7]]

const DEFAULT_LOOT: LootTable = [["iron_sword", 0.7]]

export const getLootFor = (id: JobId) => {

	const loot = LOOT_DROPS[id];

	if (!loot) {
		console.warn(`No loot found for ${id}. Returning default loot table.`)
		return DEFAULT_LOOT
	}

	return loot;

}

export const rollLoot = (id: JobId): Item[] => {
	const roll = Math.random();
	const loot = getLootFor(id);

	const filtered = loot.filter(([_key, val]) => {
		return val >= roll;
	}).map(fst)

	return filtered.map(getItem)

}