/// <reference types="jest" />

import * as Random from "./Random";

describe("Random — pickOneSeeded", () => {
	it("picks the only item from a single-element array", () => {
		const rng = { seed: "test" };
		const result = Random.pickOneSeeded(rng, [42]);
		expect(result).toBe(42);
	});

	it("is deterministic — same seed, same result", () => {
		const items = ["a", "b", "c", "d", "e"];
		const a = Random.pickOneSeeded({ seed: "mana" }, [...items]);
		const b = Random.pickOneSeeded({ seed: "mana" }, [...items]);
		expect(a).toBe(b);
	});

	it("advances the rng seed on each call", () => {
		const rng = { seed: "mana" };
		const seedBefore = rng.seed;
		Random.pickOneSeeded(rng, [1, 2, 3]);
		expect(rng.seed).not.toBe(seedBefore);
	});

	it("different seeds may pick different items", () => {
		const items = ["x", "y", "z", "w", "v"];
		const results = new Set<string>();
		for (let i = 0; i < 10; i++) {
			results.add(Random.pickOneSeeded({ seed: `s${i}` }, [...items]));
		}
		// With 10 different seeds and 5 items, we should see at least 2 different picks
		expect(results.size).toBeGreaterThan(1);
	});
});

describe("Random — pickOneUniqueSeeded", () => {
	it("picks an item not in the exclude list", () => {
		const rng = { seed: "test" };
		const result = Random.pickOneUniqueSeeded(rng, [1, 2, 3], [1, 2]);
		expect(result).toBe(3);
	});

	it("is deterministic — same inputs, same result", () => {
		const items = ["a", "b", "c"];
		const a = Random.pickOneUniqueSeeded({ seed: "x" }, [...items], ["a"]);
		const b = Random.pickOneUniqueSeeded({ seed: "x" }, [...items], ["a"]);
		expect(a).toBe(b);
	});

	it("throws when all items are excluded", () => {
		expect(() =>
			Random.pickOneUniqueSeeded({ seed: "err" }, [1, 2], [1, 2])
		).toThrow("No unique items available to pick");
	});

	it("advances the rng seed", () => {
		const rng = { seed: "advance" };
		const seedBefore = rng.seed;
		Random.pickOneUniqueSeeded(rng, [10, 20, 30], [10]);
		expect(rng.seed).not.toBe(seedBefore);
	});
});
