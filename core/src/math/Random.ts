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
  result: number;
  seed: number;
} {
  const next = seed + 0x6d2b79f5;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return {
    result: ((t ^ (t >>> 14)) >>> 0) / 4294967296,
    seed: next,
  };
}

/**
 * Returns a pseudo-random integer between min and max (inclusive).
 */
export function range(
  seed: number,
  min: number,
  max: number,
): {
  result: number;
  seed: number;
} {
  const val = value(seed);
  const result = Math.floor(val.result * (max - min + 1)) + min;
  return {
    result,
    seed: val.seed,
  };
}

export function shuffle<T>(
  seed: number,
  array: T[],
): {
  copy: T[];
  seed: number;
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
    seed: currentSeed,
  };
}

/**
 * Deterministically pick N random items using a seeded RNG.
 *
 * Pure: returns the picked items alongside the advanced seed; the input `rng`
 * is never mutated. Callers write the returned seed back (the module-wide
 * "always return the next seed" convention — see `nextRandomValue`).
 */
export function pickRandom<T>(
  rng: { seed: string },
  arr: T[],
  n: number,
): { picked: T[]; seed: string } {
  const seedNum = stringToSeed(rng.seed);
  const { copy, seed: nextNum } = shuffle(seedNum, arr);
  return { picked: copy.slice(0, n), seed: nextNum.toString(36) };
}

/**
 * Generate a single random value from a seed, returning the advanced seed.
 * Used for single-shot randomness (critical hits, 50/50 choices, etc.)
 * without needing the full shuffle machinery.
 */
export function nextRandomValue(rng: { seed: string }): {
  result: number;
  seed: string;
} {
  const seedNum = stringToSeed(rng.seed);
  const { result, seed: nextSeed } = value(seedNum);
  return { result, seed: nextSeed.toString(36) };
}

/**
 * Derive the next seed from the current seed and an action ID.
 * Used to maintain determinism across player actions and decisions.
 */
export function generateNextSeed(
  currentSeed: string,
  actionId: string,
): string {
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
 * Deterministically pick a single random item using a seeded RNG.
 *
 * Pure: returns the picked item and the advanced seed (see `pickRandom`).
 * Throws if the array is empty.
 */
export function pickOneSeeded<T>(
  rng: { seed: string },
  items: T[],
): { picked: T; seed: string } {
  const { picked, seed } = pickRandom(rng, items, 1);
  return { picked: picked[0], seed };
}

/**
 * Deterministically pick a single random item excluding certain values.
 *
 * Pure: returns the picked item and the advanced seed (see `pickRandom`).
 * Throws if no unique items are available.
 */
export function pickOneUniqueSeeded<T>(
  rng: { seed: string },
  items: T[],
  exclude: T[],
): { picked: T; seed: string } {
  const filtered = items.filter((item) => !exclude.includes(item));
  if (filtered.length === 0) {
    throw new Error("No unique items available to pick");
  }
  return pickOneSeeded(rng, filtered);
}

/**
 * Deterministically pick N random items using a seeded RNG.
 *
 * Pure: returns the picked items and the advanced seed (see `pickRandom`).
 */
export function pickRandomItemsSeeded<T>(
  rng: { seed: string },
  items: T[],
  count: number,
): { picked: T[]; seed: string } {
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
