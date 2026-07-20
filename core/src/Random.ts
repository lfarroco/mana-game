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

/**
 * Derive the next seed from the current seed and an action ID.
 * Used to maintain determinism across player actions and decisions.
 */
export function generateNextSeed(currentSeed: string, actionId: string): string {
	const input = currentSeed + actionId;
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		const char = input.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(36);
}

/**
 * Deterministically select a random option index based on session state.
 * Same seed, round, step, and optionCount always produces the same result.
 */
export function getDeterministicRandomOptionIndex(
	seed: string,
	round: number,
	step: number,
	optionCount: number
): number {
	const seededInput = `${seed}:${round}:${step}:${optionCount}`;
	return range(stringToSeed(seededInput), 0, optionCount - 1).result;
}

/**
 * Deterministically pick N random items using a seeded RNG.
 * Mutates the session's seed to advance the RNG state.
 */
export function pickRandomItemsSeeded<T>(
	rng: { seed: string },
	items: T[],
	count: number
): T[] {
	return pickRandom(rng, items, count);
}

/**
 * Deterministic Fisher-Yates shuffle using a numeric seed.
 * Same seed always produces the same shuffle order.
 */
export function shuffleWithSeed<T>(items: T[], seedNum: number): T[] {
	const { copy } = shuffle(seedNum, items);
	return copy;
}
