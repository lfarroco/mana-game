/// <reference types="jest" />

import * as Random from "./Random";

describe("Random", () => {
  describe("stringToSeed", () => {
    it("is deterministic — same input produces same output", () => {
      expect(Random.stringToSeed("hello")).toBe(Random.stringToSeed("hello"));
      expect(Random.stringToSeed("")).toBe(Random.stringToSeed(""));
    });

    it("different inputs produce different seeds", () => {
      expect(Random.stringToSeed("a")).not.toBe(Random.stringToSeed("b"));
    });

    it("returns a non-negative number", () => {
      expect(Random.stringToSeed("test")).toBeGreaterThanOrEqual(0);
      expect(Random.stringToSeed("")).toBeGreaterThanOrEqual(0);
    });

    it("golden values match expected", () => {
      expect(Random.stringToSeed("mana")).toBe(3343943);
    });
  });

  describe("value", () => {
    it("returns result between 0 and 1", () => {
      const { result } = Random.value(123);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it("is deterministic", () => {
      const a = Random.value(123);
      const b = Random.value(123);
      expect(a.result).toBe(b.result);
      expect(a.seed).toBe(b.seed);
    });

    it("different seeds produce different results", () => {
      const a = Random.value(100);
      const b = Random.value(200);
      expect(a.result).not.toBe(b.result);
    });

    it("golden values match expected", () => {
      const v = Random.value(123);
      expect(v.result).toBe(0.7872516233474016);
      expect(v.seed).toBe(1831565936);
    });
  });

  describe("range", () => {
    it("returns integer between min and max inclusive", () => {
      for (let i = 0; i < 20; i++) {
        const seed = 100 + i * 17;
        const { result } = Random.range(seed, 0, 5);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(5);
      }
    });

    it("is deterministic", () => {
      const a = Random.range(42, 0, 10);
      const b = Random.range(42, 0, 10);
      expect(a.result).toBe(b.result);
      expect(a.seed).toBe(b.seed);
    });

    it("returns min when range is single value", () => {
      const { result } = Random.range(123, 7, 7);
      expect(result).toBe(7);
    });

    it("chain of range calls produce deterministic sequence", () => {
      const seq1 = [];
      let seed = 999;
      for (let i = 0; i < 5; i++) {
        const r = Random.range(seed, 0, 100);
        seq1.push(r.result);
        seed = r.seed;
      }

      const seq2 = [];
      seed = 999;
      for (let i = 0; i < 5; i++) {
        const r = Random.range(seed, 0, 100);
        seq2.push(r.result);
        seed = r.seed;
      }

      expect(seq1).toEqual(seq2);
    });
  });

  describe("shuffle", () => {
    it("returns a copy with the same elements", () => {
      const { copy } = Random.shuffle(42, [1, 2, 3, 4, 5]);
      expect(copy.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it("does not mutate the original array", () => {
      const arr = [1, 2, 3, 4, 5];
      Random.shuffle(42, arr);
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });

    it("is deterministic", () => {
      const a = Random.shuffle(42, [1, 2, 3, 4, 5]);
      const b = Random.shuffle(42, [1, 2, 3, 4, 5]);
      expect(a.copy).toEqual(b.copy);
      expect(a.seed).toEqual(b.seed);
    });

    it("golden values match expected", () => {
      expect(Random.shuffleWithSeed([1, 2, 3, 4, 5], 42)).toEqual([
        1, 5, 3, 2, 4,
      ]);
    });

    it("single-element array returns same element", () => {
      const { copy } = Random.shuffle(123, [7]);
      expect(copy).toEqual([7]);
    });

    it("empty array returns empty array", () => {
      const { copy } = Random.shuffle(123, []);
      expect(copy).toEqual([]);
    });
  });

  describe("pickRandom", () => {
    it("picks exactly n items", () => {
      const rng = { seed: "test" };
      const result = Random.pickRandom(rng, [1, 2, 3, 4, 5], 3);
      expect(result).toHaveLength(3);
    });

    it("picks from the available items", () => {
      const pool = ["a", "b", "c"];
      const rng = { seed: "xyz" };
      const result = Random.pickRandom(rng, pool, 2);
      expect(pool).toContain(result[0]);
      expect(pool).toContain(result[1]);
    });

    it("advances the seed", () => {
      const rng = { seed: "test" };
      const initialSeed = rng.seed;
      Random.pickRandom(rng, [1, 2, 3], 2);
      expect(rng.seed).not.toBe(initialSeed);
    });
  });

  describe("nextRandomValue", () => {
    it("returns value between 0 and 1", () => {
      const { result } = Random.nextRandomValue({ seed: "42" });
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    it("is deterministic for same seed", () => {
      const a = Random.nextRandomValue({ seed: "hello" });
      const b = Random.nextRandomValue({ seed: "hello" });
      expect(a.result).toBe(b.result);
      expect(a.seed).toBe(b.seed);
    });

    it("produces different values when seed is manually advanced", () => {
      const rng = { seed: "chain" };
      const v1 = Random.nextRandomValue(rng);
      rng.seed = v1.seed;
      const v2 = Random.nextRandomValue(rng);
      expect(v1.result).not.toBe(v2.result);
    });

    it("sequential calls from same starting seed are reproducible", () => {
      const seq1: number[] = [];
      const rng1 = { seed: "7" };
      for (let i = 0; i < 3; i++) {
        const v = Random.nextRandomValue(rng1);
        seq1.push(v.result);
        rng1.seed = v.seed;
      }

      const seq2: number[] = [];
      const rng2 = { seed: "7" };
      for (let i = 0; i < 3; i++) {
        const v = Random.nextRandomValue(rng2);
        seq2.push(v.result);
        rng2.seed = v.seed;
      }

      expect(seq1).toEqual(seq2);
    });
  });

  describe("generateNextSeed", () => {
    it("is deterministic", () => {
      const a = Random.generateNextSeed("seed", "action");
      const b = Random.generateNextSeed("seed", "action");
      expect(a).toBe(b);
    });

    it("different action produces different seed", () => {
      const a = Random.generateNextSeed("seed", "action1");
      const b = Random.generateNextSeed("seed", "action2");
      expect(a).not.toBe(b);
    });

    it("returns a non-empty string", () => {
      const result = Random.generateNextSeed("s", "a");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("golden values match expected", () => {
      expect(Random.generateNextSeed("seed", "action")).toBe("vx7ms9");
    });
  });

  describe("shuffleWithSeed", () => {
    it("is deterministic", () => {
      const a = Random.shuffleWithSeed([1, 2, 3, 4], 42);
      const b = Random.shuffleWithSeed([1, 2, 3, 4], 42);
      expect(a).toEqual(b);
    });

    it("does not mutate input", () => {
      const arr = [10, 20, 30];
      Random.shuffleWithSeed(arr, 7);
      expect(arr).toEqual([10, 20, 30]);
    });

    it("contains same elements after shuffle", () => {
      const result = Random.shuffleWithSeed([5, 6, 7, 8], 99);
      expect(result.sort()).toEqual([5, 6, 7, 8]);
    });
  });

  describe("pickRandomItemsSeeded", () => {
    it("returns exactly count items", () => {
      const rng = { seed: "test" };
      const items = [1, 2, 3, 4, 5];
      const result = Random.pickRandomItemsSeeded(rng, items, 3);
      expect(result).toHaveLength(3);
    });

    it("advances the seed", () => {
      const rng = { seed: "advance" };
      const initial = rng.seed;
      Random.pickRandomItemsSeeded(rng, ["a", "b", "c"], 2);
      expect(rng.seed).not.toBe(initial);
    });
  });
});
