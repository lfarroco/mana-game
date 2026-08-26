export const MAX_SEED_LENGTH = 12;

/** Largest 12-digit seed value (exclusive) — keeps seeds within the numpad cap. */
export const MAX_SEED_BOUND = 10 ** MAX_SEED_LENGTH;

export const sanitizeNumericSeedInput = (raw: string): string =>
  raw.replace(/\D/g, "").slice(0, MAX_SEED_LENGTH);

export const parseNumericSeed = (text: string): number | null => {
  if (text === "") return null;
  const parsed = parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Format a raw random integer as a numeric seed string.
 *
 * Clamps to [0, 10^MAX_SEED_LENGTH) and strips non-digits so the result always
 * fits the numpad input's 12-digit cap and stays safe to replay via
 * `stringToSeed` (any string hashes, numbers are just the player-facing
 * format). Callers supply the entropy (crypto / Date.now / Math.random).
 */
export const formatNumericSeed = (value: number): string =>
  sanitizeNumericSeedInput(String(Math.floor(Math.abs(value) % MAX_SEED_BOUND)));
