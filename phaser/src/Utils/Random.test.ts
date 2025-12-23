import { setSeed, value, range, shuffle, getSeed } from "./Random";

describe("Random Module", () => {
	it("should produce deterministic results with the same seed", () => {
		setSeed(12345);
		const val1 = value();
		const val2 = value();

		setSeed(12345);
		const val3 = value();
		const val4 = value();

		expect(val1).toBe(val3);
		expect(val2).toBe(val4);
	});

	it("should produce different results with different seeds", () => {
		setSeed(12345);
		const val1 = value();

		setSeed(67890);
		const val2 = value();

		expect(val1).not.toBe(val2);
	});

	it("should generate integers within range", () => {
		setSeed(123);

		for (let i = 0; i < 100; i++) {
			const val = range(1, 10);
			expect(val).toBeGreaterThanOrEqual(1);
			expect(val).toBeLessThanOrEqual(10);
			expect(Number.isInteger(val)).toBe(true);
		}
	});

	it("should shuffle arrays deterministically", () => {
		const arr = [1, 2, 3, 4, 5];

		setSeed(42);
		const shuffled1 = shuffle(arr);

		setSeed(42);
		const shuffled2 = shuffle(arr);

		expect(shuffled1).toEqual(shuffled2);
		expect(shuffled1.length).toBe(arr.length);
		arr.forEach(item => expect(shuffled1).toContain(item));
	});

	it("should get and set seed correctly", () => {
		setSeed(999);
		expect(getSeed()).toBe(999);
	});
});

