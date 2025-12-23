/**
 * Random number generation utility providing seeded RNG
 * using the Mulberry32 algorithm.
 */
let seed: number = Date.now();

/**
 * Sets the seed for the random number generator.
 * @param newSeed The seed value (integer).
 */
export function setSeed(newSeed: number): void {
	seed = newSeed;
}

/**
 * Returns the current seed.
 */
export function getSeed(): number {
	return seed;
}

/**
 * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
 * Implements the Mulberry32 algorithm.
 */
export function value(): number {
	let t = (seed += 0x6d2b79f5);
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Returns a pseudo-random integer between min and max (inclusive).
 * @param min Minimum value.
 * @param max Maximum value.
 */
export function range(min: number, max: number): number {
	return Math.floor(value() * (max - min + 1)) + min;
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 */
export function shuffle<T>(array: T[]): T[] {
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(value() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

/**
 * Pick random elements from an array
 * @param arr Array to pick from
 * @param n Number of elements to pick
 */
export function pickRandom<T>(arr: T[], n: number): T[] {
	return shuffle(arr).slice(0, n);
}

