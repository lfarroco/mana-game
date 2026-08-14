/// <reference types="jest" />

import { hexToVector3, mixHexColors } from "./color";

describe("Color", () => {
  describe("hexToVector3", () => {
    it("converts hex colors to normalized rgb vectors", () => {
      expect(hexToVector3(0xff00ff)).toEqual({ x: 1, y: 0, z: 1 });
      expect(hexToVector3(0x000000)).toEqual({ x: 0, y: 0, z: 0 });
      expect(hexToVector3(0x00ff00)).toEqual({ x: 0, y: 1, z: 0 });
    });
  });

  describe("mixHexColors", () => {
    it("mixes black and white halfway to gray", () => {
      // Math.round(127.5) rounds half up to 128, so the exact result is 0x808080.
      expect(mixHexColors(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    });

    it("returns the from color at amount 0", () => {
      expect(mixHexColors(0xff0000, 0x0000ff, 0)).toBe(0xff0000);
    });

    it("returns the to color at amount 1", () => {
      expect(mixHexColors(0xff0000, 0x0000ff, 1)).toBe(0x0000ff);
    });

    it("clamps out-of-range amounts", () => {
      expect(mixHexColors(0xff0000, 0x0000ff, -1)).toBe(0xff0000);
      expect(mixHexColors(0xff0000, 0x0000ff, 2)).toBe(0x0000ff);
    });
  });
});
