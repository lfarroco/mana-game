import { SessionData } from "./Models";

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

export function pickRandom<T>(session: SessionData, arr: T[], n: number): T[] {
	const next = nextValue();
	session.seed = next.toString();
	return shuffle(next, arr).copy.slice(0, n);
}

// TODO: save seed in the env
// Stateful compatibility layer for legacy code
// This allows code that relied on global RNG state to continue working
let globalSeed: number = Math.floor(Math.random() * 0xFFFFFFFF);

export function nextValue(): number {
	const result = value(globalSeed);
	globalSeed = result.seed;
	return result.result;
}

export function nextRange(min: number, max: number): number {
	const result = range(globalSeed, min, max);
	globalSeed = result.seed;
	return result.result;
}

export function nextShuffle<T>(array: T[]): T[] {
	const result = shuffle(globalSeed, array);
	globalSeed = result.seed;
	return result.copy;
}

export function nextPickRandom<T>(arr: T[], n: number): T[] {
	const result = shuffle(globalSeed, arr);
	globalSeed = result.seed;
	return result.copy.slice(0, n);
}

export function setSeed(seed: number): void {
	globalSeed = seed;
}

export function getSeed(): number {
	return globalSeed;
}
