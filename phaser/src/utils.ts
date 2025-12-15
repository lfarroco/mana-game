// picks n random elements from an array using Fisher-Yates shuffle
export function pickRandom<T>(arr: T[], n: number): T[] {
	return shuffle(arr).slice(0, n);
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
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr]; // Don't mutate the original array
	// Fisher-Yates shuffle
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}
const formatter = new Intl.NumberFormat("en-US", { notation: "compact" });

export const compactNumber = (n: number) => formatter.format(parseInt(n.toFixed(0)));