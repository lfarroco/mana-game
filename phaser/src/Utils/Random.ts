/**
 * Returns a pseudo-random number between 0 (inclusive) and 1 (exclusive).
 * Implements the Mulberry32 algorithm.
 */
export function value(seed: number): {
	result: number,
	seed: number
} {
	const next = seed + 0x6d2b79f5;
	let t = next;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return {
		result: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
		seed: next
	}
}

/**
 * Returns a pseudo-random integer between min and max (inclusive).
 */
export function range(seed: number, min: number, max: number): {
	result: number,
	seed: number
} {
	const val = value(seed)
	const result = Math.floor(val.result * (max - min + 1)) + min;
	return {
		result,
		seed: val.seed
	}
}

export function shuffle<T>(seed: number, array: T[]): {
	copy: T[],
	seed: number
} {

	const val = value(seed)
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(val.result * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return {
		copy,
		seed: val.seed
	}
}

export function pickRandom<T>(seed: number, arr: T[], n: number): T[] {
	return shuffle(seed, arr).slice(0, n);
}

