/// <reference types="jest" />

import * as Regen from "../Combat/RegenSystem";

describe("RegenSystem", () => {
	describe("initializeRegenSystem", () => {
		it("returns empty regen rates map", () => {
			const state = Regen.initializeRegenSystem();
			expect(state.regenRates.size).toBe(0);
		});
	});

	describe("applyRegen", () => {
		it("adds regen rate for a force", () => {
			const state = Regen.initializeRegenSystem();
			const next = Regen.applyRegen(state, "A", 20);
			expect(Regen.getRegenRate(next, "A")).toBe(20);
		});

		it("stacks regen rates", () => {
			const state = Regen.initializeRegenSystem();
			const s1 = Regen.applyRegen(state, "A", 10);
			const s2 = Regen.applyRegen(s1, "A", 15);
			expect(Regen.getRegenRate(s2, "A")).toBe(25);
		});

		it("returns same state for zero or negative amount", () => {
			const state = Regen.initializeRegenSystem();
			const s1 = Regen.applyRegen(state, "A", 0);
			expect(s1).toBe(state);
			const s2 = Regen.applyRegen(state, "A", -5);
			expect(s2).toBe(state);
		});

		it("does not mutate previous state", () => {
			const state = Regen.initializeRegenSystem();
			Regen.applyRegen(state, "A", 50);
			expect(Regen.getRegenRate(state, "A")).toBe(0);
		});
	});

	describe("getRegenRate", () => {
		it("returns 0 for unknown force", () => {
			const state = Regen.initializeRegenSystem();
			expect(Regen.getRegenRate(state, "UNKNOWN")).toBe(0);
		});

		it("returns correct amount", () => {
			const state = Regen.initializeRegenSystem();
			const s1 = Regen.applyRegen(state, "A", 15);
			expect(Regen.getRegenRate(s1, "A")).toBe(15);
		});
	});

	describe("clearRegen", () => {
		it("removes regen for a force", () => {
			const state = Regen.initializeRegenSystem();
			const s1 = Regen.applyRegen(state, "A", 30);
			const s2 = Regen.clearRegen(s1, "A");
			expect(Regen.getRegenRate(s2, "A")).toBe(0);
		});

		it("does not affect other forces", () => {
			const state = Regen.initializeRegenSystem();
			const s1 = Regen.applyRegen(state, "A", 30);
			const s2 = Regen.applyRegen(s1, "B", 40);
			const s3 = Regen.clearRegen(s2, "A");
			expect(Regen.getRegenRate(s3, "A")).toBe(0);
			expect(Regen.getRegenRate(s3, "B")).toBe(40);
		});
	});

	describe("getRegenRate", () => {
		it("returns 0 for unset force", () => {
			const state = Regen.initializeRegenSystem();
			expect(Regen.getRegenRate(state, "Z")).toBe(0);
		});
	});
});
