export const MAX_SEED_LENGTH = 12;

export const sanitizeNumericSeedInput = (raw: string): string =>
  raw.replace(/\D/g, "").slice(0, MAX_SEED_LENGTH);

export const parseNumericSeed = (text: string): number | null => {
  if (text === "") return null;
  const parsed = parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
