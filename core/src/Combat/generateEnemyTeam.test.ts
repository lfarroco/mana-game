/// <reference types="jest" />

import { generateEnemyTeam } from "./generateEnemyTeam";
import * as Card from "../Entities/Card";
import { CardDefinition, CardCollection } from "../Models";
import { FORCE_ID_CPU } from "../Constants";

const mockCards: CardDefinition[] = [
	{ id: "core_a", pic: "", cooldown: 3000, effects: [], reactions: [], isCore: true, life: 500 },
	{ id: "core_b", pic: "", cooldown: 3000, effects: [], reactions: [], isCore: true, life: 500 },
	{ id: "unit_1", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_2", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_3", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_4", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_5", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_6", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_7", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_8", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "unit_9", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 1 },
	{ id: "silver_1", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 2 },
	{ id: "gold_1", pic: "", cooldown: 1000, effects: [], reactions: [], rank: 3 },
];

function registerTestCards(): void {
	Card.resetRegistry();
	Card.registerCollection({
		id: "test",
		name: "Test Collection",
		cards: mockCards,
	});
}

describe("generateEnemyTeam", () => {
	beforeEach(() => {
		registerTestCards();
	});

	it("returns units with CPU force", () => {
		const units = generateEnemyTeam("seed1", 0, 1, mockCards);
		expect(units.length).toBeGreaterThan(0);
		for (const u of units) {
			expect(u.force).toBe(FORCE_ID_CPU);
		}
	});

	it("has exactly one core unit", () => {
		const units = generateEnemyTeam("seed2", 0, 1, mockCards);
		const cores = units.filter((u) => u.isCore);
		expect(cores).toHaveLength(1);
	});

	it("is deterministic — same inputs produce same team", () => {
		const a = generateEnemyTeam("mana", 3, 5, mockCards);
		const b = generateEnemyTeam("mana", 3, 5, mockCards);
		expect(a.map((u) => u.cardId)).toEqual(b.map((u) => u.cardId));
		expect(a.map((u) => u.position)).toEqual(b.map((u) => u.position));
	});

	it("different seeds produce different teams", () => {
		const a = generateEnemyTeam("seedA", 0, 3, mockCards);
		const b = generateEnemyTeam("seedB", 0, 3, mockCards);
		const aFingerprint = a.map((u) => `${u.cardId}@${u.position}`).sort().join(",");
		const bFingerprint = b.map((u) => `${u.cardId}@${u.position}`).sort().join(",");
		expect(aFingerprint).not.toBe(bFingerprint);
	});

	it("scales units with round", () => {
		const round1 = generateEnemyTeam("s", 0, 1, mockCards);
		const round3 = generateEnemyTeam("s", 0, 3, mockCards);
		expect(round3.length).toBeGreaterThan(round1.length);
	});

	it("core life scales with round", () => {
		const r1 = generateEnemyTeam("s", 0, 1, mockCards);
		const r5 = generateEnemyTeam("s", 0, 5, mockCards);
		const core1 = r1.find((u) => u.isCore)!;
		const core5 = r5.find((u) => u.isCore)!;
		expect(core5.life).toBeGreaterThan(core1.life);
	});

	it("caps at MAX_UNITS (9)", () => {
		const units = generateEnemyTeam("big", 0, 10, mockCards);
		expect(units.length).toBeLessThanOrEqual(9);
	});

	it("all units have unique positions", () => {
		const units = generateEnemyTeam("pos", 0, 5, mockCards);
		const positionKeys = units.map((u) => `${u.position[0]},${u.position[1]}`);
		expect(new Set(positionKeys).size).toBe(units.length);
	});

	it("throws for negative round", () => {
		expect(() => generateEnemyTeam("err", 0, -1, mockCards)).toThrow("Round must be a non-negative number");
	});

	it("throws for empty pool", () => {
		expect(() => generateEnemyTeam("err", 0, 1, [])).toThrow("Card pool cannot be empty");
	});

	it("applies post-win-10 power scaling", () => {
		const normal = generateEnemyTeam("scale", 5, 12, mockCards);
		const scaled = generateEnemyTeam("scale", 10, 12, mockCards);
		const normalCore = normal.find((u) => u.isCore)!;
		const scaledCore = scaled.find((u) => u.isCore)!;
		expect(scaledCore.life).toBeGreaterThan(normalCore.life);
	});
});

