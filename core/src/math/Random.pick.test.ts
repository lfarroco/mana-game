/// <reference types="jest" />

import * as Random from "./Random";

describe("Random — pickOneSeeded", () => {
  it("picks the only item from a single-element array", () => {
    const rng = { seed: "test" };
    const { picked } = Random.pickOneSeeded(rng, [42]);
    expect(picked).toBe(42);
  });

  it("is deterministic — same seed, same result", () => {
    const items = ["a", "b", "c", "d", "e"];
    const a = Random.pickOneSeeded({ seed: "mana" }, [...items]);
    const b = Random.pickOneSeeded({ seed: "mana" }, [...items]);
    expect(a.picked).toBe(b.picked);
    expect(a.seed).toBe(b.seed);
  });

  it("returns the advanced seed and does not mutate the input rng", () => {
    const rng = { seed: "mana" };
    const { picked, seed } = Random.pickOneSeeded(rng, [1, 2, 3]);
    expect([1, 2, 3]).toContain(picked);
    expect(seed).not.toBe("mana");
    // Pure convention: the input rng is untouched; the caller writes back.
    expect(rng.seed).toBe("mana");
  });

  it("different seeds may pick different items", () => {
    const items = ["x", "y", "z", "w", "v"];
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      results.add(Random.pickOneSeeded({ seed: `s${i}` }, [...items]).picked);
    }
    // With 10 different seeds and 5 items, we should see at least 2 different picks
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("Random — pickOneUniqueSeeded", () => {
  it("picks an item not in the exclude list", () => {
    const rng = { seed: "test" };
    const { picked } = Random.pickOneUniqueSeeded(rng, [1, 2, 3], [1, 2]);
    expect(picked).toBe(3);
  });

  it("is deterministic — same inputs, same result", () => {
    const items = ["a", "b", "c"];
    const a = Random.pickOneUniqueSeeded({ seed: "x" }, [...items], ["a"]);
    const b = Random.pickOneUniqueSeeded({ seed: "x" }, [...items], ["a"]);
    expect(a.picked).toBe(b.picked);
    expect(a.seed).toBe(b.seed);
  });

  it("throws when all items are excluded", () => {
    expect(() =>
      Random.pickOneUniqueSeeded({ seed: "err" }, [1, 2], [1, 2]),
    ).toThrow("No unique items available to pick");
  });

  it("returns the advanced seed", () => {
    const { picked, seed } = Random.pickOneUniqueSeeded(
      { seed: "advance" },
      [10, 20, 30],
      [10],
    );
    expect([10, 20, 30]).toContain(picked);
    expect(seed).not.toBe("advance");
  });
});
