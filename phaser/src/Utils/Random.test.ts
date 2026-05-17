import { setSeed, nextValue, nextRange, nextShuffle, getSeed, shuffle } from "@Utils/Random";

describe("Random Module", () => {
	it("should produce deterministic results with the same seed", () => {
		setSeed(12345);
		const val1 = nextValue();
		const val2 = nextValue();

		setSeed(12345);
		const val3 = nextValue();
		const val4 = nextValue();

		expect(val1).toBe(val3);
		expect(val2).toBe(val4);
	});

	it("should produce different results with different seeds", () => {
		setSeed(12345);
		const val1 = nextValue();

		setSeed(67890);
		const val2 = nextValue();

		expect(val1).not.toBe(val2);
	});

	it("should generate integers within range", () => {
		setSeed(123);

		for (let i = 0; i < 100; i++) {
			const val = nextRange(1, 10);
			expect(val).toBeGreaterThanOrEqual(1);
			expect(val).toBeLessThanOrEqual(10);
			expect(Number.isInteger(val)).toBe(true);
		}
	});

	it("should shuffle arrays deterministically", () => {
		const arr = [1, 2, 3, 4, 5];

		setSeed(42);
		const shuffled1 = nextShuffle(arr);

		setSeed(42);
		const shuffled2 = nextShuffle(arr);

		expect(shuffled1).toEqual(shuffled2);
		expect(shuffled1.length).toBe(arr.length);
		arr.forEach((item) => expect(shuffled1).toContain(item));
	});

	it("should advance the shuffle seed for each swap", () => {
		const shortShuffle = shuffle(42, [1, 2]);
		const longShuffle = shuffle(42, [1, 2, 3, 4, 5]);

		expect(shortShuffle.seed).not.toBe(longShuffle.seed);
	});

	it("should get and set seed correctly", () => {
		setSeed(999);
		expect(getSeed()).toBe(999);
	});
});
