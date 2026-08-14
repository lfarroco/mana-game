/// <reference types="jest" />

import { compactNumber } from "./format";

describe("format", () => {
  describe("compactNumber", () => {
    it("formats small numbers without compaction", () => {
      expect(compactNumber(0)).toBe("0");
      expect(compactNumber(999)).toBe("999");
    });

    it("compacts thousands", () => {
      expect(compactNumber(1000)).toBe("1K");
      expect(compactNumber(12345)).toBe("12K");
    });

    it("compacts millions with one decimal", () => {
      expect(compactNumber(1500000)).toBe("1.5M");
    });
  });
});
