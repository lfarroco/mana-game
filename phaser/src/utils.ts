import { range, pickRandom as rngPickRandom, shuffle as rngShuffle } from "./Utils/Random";

// picks n random elements from an array using Fisher-Yates shuffle
export function pickRandom<T>(arr: T[], n: number): T[] {
	return rngPickRandom(arr, n);
}

export function pickOne<a>(arr: a[]): a {
	const [item] = pickRandom(arr, 1);
	return item;
}

export function pickOneUnique<a>(arr: a[], exclude: a[]): a {
	const filtered = arr.filter((item) => !exclude.includes(item));
	if (filtered.length === 0) {
		throw new Error("No unique items available to pick");
	}
	return pickOne(filtered);
}

export function randomBetween(min: number, max: number): number {
	return range(min, max);
}

export function shuffle<T>(arr: T[]): T[] {
	return rngShuffle(arr);
}
const formatter = new Intl.NumberFormat("en-US", { notation: "compact" });

export const compactNumber = (n: number) => formatter.format(parseInt(n.toFixed(0)));