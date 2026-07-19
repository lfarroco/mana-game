/**
 * Seeding and Randomization
 *
 * Pure utility functions for deterministic random number generation and seed derivation.
 * All functions are pure and stateless, enabling reproducible game runs.
 */

import { SessionData } from "./Models";
import * as Random from "./Random";

/**
 * Convert a string seed into a numeric hash suitable for RNG.
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
 * Same session.seed, round, step, and optionCount always produces the same result.
 */
export function getDeterministicRandomOptionIndex(
	seed: string,
	round: number,
	step: number,
	optionCount: number
): number {
	const seededInput = `${seed}:${round}:${step}:${optionCount}`;
	return Random.range(stringToSeed(seededInput), 0, optionCount - 1).result;
}

/**
 * Deterministically pick N random items from an array using a seeded RNG.
 * Useful for shop generation and encounter options.
 */
export function pickRandomItemsSeeded<T>(
	env: SessionData,
	items: T[],
	count: number
): T[] {
	return Random.pickRandom(env, items, count);
}

/**
 * Deterministic Fisher-Yates shuffle using a numeric seed.
 * Same seed always produces the same shuffle order.
 */
export function shuffleWithSeed<T>(items: T[], seedNum: number): T[] {
	const shuffled = [...items];
	let currentSeed = seedNum;

	for (let i = shuffled.length - 1; i > 0; i--) {
		const x = Math.sin(currentSeed++) * 10000;
		const rnd = x - Math.floor(x);
		const j = Math.floor(rnd * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	return shuffled;
}
