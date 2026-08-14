/// <reference types="jest" />

import { parseNumericSeed, sanitizeNumericSeedInput } from "./seed";

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
});
