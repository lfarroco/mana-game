import { RNGManager } from "./Random";

describe("RNGManager", () => {
	it("should produce deterministic results with the same seed", () => {
		const rng = RNGManager.getInstance();

		rng.setSeed(12345);
		const val1 = rng.value();
		const val2 = rng.value();

		rng.setSeed(12345);
		const val3 = rng.value();
		const val4 = rng.value();

		expect(val1).toBe(val3);
		expect(val2).toBe(val4);
	});

	it("should produce different results with different seeds", () => {
		const rng = RNGManager.getInstance();

		rng.setSeed(12345);
		const val1 = rng.value();

		rng.setSeed(67890);
		const val2 = rng.value();

		expect(val1).not.toBe(val2);
	});

	it("should generate integers within range", () => {
		const rng = RNGManager.getInstance();
		rng.setSeed(123);

		for (let i = 0; i < 100; i++) {
			const val = rng.range(1, 10);
			expect(val).toBeGreaterThanOrEqual(1);
			expect(val).toBeLessThanOrEqual(10);
			expect(Number.isInteger(val)).toBe(true);
		}
	});

	it("should shuffle arrays deterministically", () => {
		const rng = RNGManager.getInstance();
		const arr = [1, 2, 3, 4, 5];

		rng.setSeed(42);
		const shuffled1 = rng.shuffle(arr);

		rng.setSeed(42);
		const shuffled2 = rng.shuffle(arr);

		expect(shuffled1).toEqual(shuffled2);
		expect(shuffled1.length).toBe(arr.length);
		arr.forEach(item => expect(shuffled1).toContain(item));
	});
});
