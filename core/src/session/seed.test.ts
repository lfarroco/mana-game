/// <reference types="jest" />

import {
  MAX_SEED_BOUND,
  MAX_SEED_LENGTH,
  formatNumericSeed,
  parseNumericSeed,
  sanitizeNumericSeedInput,
} from "./seed";

describe("Seed", () => {
  describe("sanitizeNumericSeedInput", () => {
    it("strips non-digit characters", () => {
      expect(sanitizeNumericSeedInput("ab12cd34")).toBe("1234");
    });

    it("caps the input at MAX_SEED_LENGTH digits", () => {
      expect(sanitizeNumericSeedInput("12345678901234567890")).toBe(
        "123456789012",
      );
    });

    it("returns an empty string for empty input", () => {
      expect(sanitizeNumericSeedInput("")).toBe("");
    });
  });

  describe("parseNumericSeed", () => {
    it("returns null for empty text", () => {
      expect(parseNumericSeed("")).toBeNull();
    });

    it("returns null for non-numeric text", () => {
      expect(parseNumericSeed("abc")).toBeNull();
    });

    it("parses numeric text", () => {
      expect(parseNumericSeed("42")).toBe(42);
    });

    it("parses text with leading whitespace", () => {
      expect(parseNumericSeed("  7")).toBe(7);
    });
  });

  describe("formatNumericSeed", () => {
    it("keeps a value within the bound as-is", () => {
      expect(formatNumericSeed(42)).toBe("42");
    });

    it("clamps to [0, MAX_SEED_BOUND)", () => {
      expect(formatNumericSeed(MAX_SEED_BOUND)).toBe("0");
      expect(formatNumericSeed(MAX_SEED_BOUND + 123)).toBe("123");
    });

    it("never exceeds MAX_SEED_LENGTH digits", () => {
      expect(formatNumericSeed(999999999999)).toBe("999999999999");
      expect(formatNumericSeed(999999999999).length).toBe(MAX_SEED_LENGTH);
      expect(formatNumericSeed(1e15).length).toBeLessThanOrEqual(MAX_SEED_LENGTH);
    });

    it("normalizes negative sources by absolute value", () => {
      expect(formatNumericSeed(-42)).toBe("42");
    });

    it("returns only digits (no exponent/separators)", () => {
      expect(formatNumericSeed(1.5e12)).toMatch(/^\d+$/);
    });
  });
});
