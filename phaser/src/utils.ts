
// picks n random elements from an array using Fisher-Yates shuffle
export function pickRandom<T>(arr: T[], n: number): T[] {
	const copy = [...arr]; // Don't mutate the original array
	// Fisher-Yates shuffle
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, n);
}

export function pickOne<a>(arr: a[]): a {
	const [item] = pickRandom(arr, 1);
	return item;
}

export function randomBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function devlog(msg: string) {
	if (process.env.NODE_ENV === 'development') {
		console.log(msg);
	}
}