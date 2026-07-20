/// <reference types="jest" />

import * as geom from "./Geometry";

describe("Geometry", () => {
	describe("eqVec2", () => {
		it("returns true for identical vectors", () => {
			expect(geom.eqVec2([0, 0], [0, 0])).toBe(true);
			expect(geom.eqVec2([1, 2], [1, 2])).toBe(true);
			expect(geom.eqVec2([-1, -1], [-1, -1])).toBe(true);
		});

		it("returns false for different vectors", () => {
			expect(geom.eqVec2([0, 0], [0, 1])).toBe(false);
			expect(geom.eqVec2([0, 0], [1, 0])).toBe(false);
			expect(geom.eqVec2([1, 2], [2, 1])).toBe(false);
		});
	});

	describe("eqX", () => {
		it("returns true when x coordinates match", () => {
			expect(geom.eqX([0, 0], [0, 1])).toBe(true);
			expect(geom.eqX([5, 2], [5, 9])).toBe(true);
		});

		it("returns false when x coordinates differ", () => {
			expect(geom.eqX([0, 0], [1, 0])).toBe(false);
		});
	});

	describe("eqY", () => {
		it("returns true when y coordinates match", () => {
			expect(geom.eqY([0, 0], [1, 0])).toBe(true);
			expect(geom.eqY([2, 5], [9, 5])).toBe(true);
		});

		it("returns false when y coordinates differ", () => {
			expect(geom.eqY([0, 0], [0, 1])).toBe(false);
		});
	});

	describe("sumVec2", () => {
		it("adds two vectors component-wise", () => {
			expect(geom.sumVec2([1, 2], [3, 4])).toEqual([4, 6]);
		});

		it("handles negative values", () => {
			expect(geom.sumVec2([1, -2], [-3, 5])).toEqual([-2, 3]);
		});

		it("handles zero vectors", () => {
			expect(geom.sumVec2([0, 0], [0, 0])).toEqual([0, 0]);
			expect(geom.sumVec2([5, 5], [0, 0])).toEqual([5, 5]);
		});
	});

	describe("centerOf", () => {
		it("returns half of width and height", () => {
			expect(geom.centerOf([100, 100])).toEqual([50, 50]);
			expect(geom.centerOf([10, 6])).toEqual([5, 3]);
		});

		it("handles odd dimensions", () => {
			expect(geom.centerOf([3, 3])).toEqual([1.5, 1.5]);
		});
	});

	describe("snakeDistanceBetween", () => {
		it("returns Manhattan distance", () => {
			expect(geom.snakeDistanceBetween([0, 0], [3, 4])).toBe(7);
			expect(geom.snakeDistanceBetween([1, 1], [2, 2])).toBe(2);
			expect(geom.snakeDistanceBetween([0, 0], [0, 0])).toBe(0);
		});

		it("handles negative coordinates", () => {
			expect(geom.snakeDistanceBetween([-1, -1], [1, 1])).toBe(4);
		});
	});

	describe("distanceBetween", () => {
		it("returns Euclidean distance", () => {
			expect(geom.distanceBetween([0, 0], [3, 4])).toBe(5);
			expect(geom.distanceBetween([0, 0], [0, 0])).toBe(0);
			expect(geom.distanceBetween([1, 1], [1, 1])).toBe(0);
		});

		it("handles negative coordinates", () => {
			const d = geom.distanceBetween([-3, 0], [0, 4]);
			expect(d).toBe(5);
		});
	});

	describe("isInside", () => {
		it("returns true when point is inside rect", () => {
			expect(geom.isInside([0, 0], [10, 10], [5, 5])).toBe(true);
			expect(geom.isInside([0, 0], [10, 10], [0, 0])).toBe(true);
			expect(geom.isInside([0, 0], [10, 10], [10, 10])).toBe(true);
		});

		it("returns false when point is outside rect", () => {
			expect(geom.isInside([0, 0], [10, 10], [11, 5])).toBe(false);
			expect(geom.isInside([0, 0], [10, 10], [5, 11])).toBe(false);
			expect(geom.isInside([0, 0], [10, 10], [-1, 5])).toBe(false);
		});

		it("handles negative dimensions", () => {
			expect(geom.isInside([10, 10], [-5, -5], [7, 7])).toBe(true);
			expect(geom.isInside([10, 10], [-5, -5], [4, 4])).toBe(false);
		});
	});
});
