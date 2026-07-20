/**
 * Deterministic string-to-number hash for seeding.
 * Same input always produces the same output.
 */
export function stringToSeed(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash);
}

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
	let currentSeed = seed;
	const copy = [...array];
	for (let i = copy.length - 1; i > 0; i--) {
		const val = value(currentSeed);
		currentSeed = val.seed;
		const j = Math.floor(val.result * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return {
		copy,
		seed: currentSeed
	}
}

export function pickRandom<T>(rng: { seed: string }, arr: T[], n: number): T[] {
	const seedNum = stringToSeed(rng.seed);
	const { copy, seed: nextNum } = shuffle(seedNum, arr);
	rng.seed = nextNum.toString(36);
	return copy.slice(0, n);
}

/**
 * Generate a single random value from a seed, returning the advanced seed.
 * Used for single-shot randomness (critical hits, 50/50 choices, etc.)
 * without needing the full shuffle machinery.
 */
export function nextRandomValue(rng: { seed: string }): { result: number; seed: string } {
	const seedNum = stringToSeed(rng.seed);
	const { result, seed: nextSeed } = value(seedNum);
	return { result, seed: nextSeed.toString(36) };
}
