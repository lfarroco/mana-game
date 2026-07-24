/// <reference types="jest" />

import * as SessionManagement from "./SessionManagement";
import * as Models from "../Models";
import * as Card from "../Entities/Card";

const mockCards = [
	{ id: "core_a", pic: "", cooldown: 3000, effects: [], reactions: [], isCore: true, life: 500 },
];

function registerTestCards(): void {
	Card.setCardsMap(new Map(mockCards.map(c => [c.id, c] as const)));
}

function makeSession(overrides: Partial<Models.SessionData> = {}): Models.SessionData {
	return {
		id: "test-session",
		player_id: "p1",
		session_type: { type: "singleplayer" },
		phase: "encounter",
		round: 1,
		step: 1,
		seed: "test-seed",
		initial_seed: "test-seed",
		options: [],
		team: { units: [] },
		wins: 0,
		losses: 0,
		action_log: [],
		...overrides,
	};
}

function makeUnit(id: string, pos: [number, number], overrides: Partial<Models.Unit> = {}): Models.Unit {
	return {
		id,
		cardId: `card_${id}`,
		pic: "",
		force: "PLAYER",
		position: pos,
		rank: 1,
		power: 10,
		bonusPower: 0,
		life: 100,
		maxLife: 100,
		shield: 0,
		cooldown: 1000,
		evade: 0,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: false,
		...overrides,
	};
}

describe("SessionManagement", () => {
	beforeEach(() => {
		registerTestCards();
	});
	describe("createDefaultRunStats", () => {
		it("returns zeroed stats", () => {
			const stats = SessionManagement.createDefaultRunStats();
			expect(stats.damageDealt).toBe(0);
			expect(stats.poisonDealt).toBe(0);
			expect(stats.shieldDealt).toBe(0);
			expect(stats.regenDealt).toBe(0);
			expect(stats.healDealt).toBe(0);
			expect(stats.mostPowerfulUnit).toBeNull();
			expect(stats.totalUnitsRecruited).toBe(0);
			expect(stats.unitUsage).toEqual({});
		});
	});

	describe("createInitialSession", () => {
		it("creates a session with defaults", () => {
			const session = SessionManagement.createInitialSession("p1", undefined, "seed123");
			expect(session.player_id).toBe("p1");
			expect(session.phase).toBe("encounter");
			expect(session.round).toBe(1);
			expect(session.step).toBe(1);
			expect(session.seed).toBe("seed123");
			expect(session.initial_seed).toBe("seed123");
			expect(session.wins).toBe(0);
			expect(session.losses).toBe(0);
			expect(session.team.units).toEqual([]);
		});

		it("generates initial options", () => {
			const session = SessionManagement.createInitialSession("p1", undefined, "opt-seed");
			expect(session.options.length).toBeGreaterThan(0);
			expect(session.options[0].id).toBeDefined();
		});

		it("creates core unit when crystalId is provided", () => {
			const session = SessionManagement.createInitialSession("p1", "core_a", "seed");
			expect(session.team.units).toHaveLength(1);
			expect(session.team.units[0].isCore).toBe(true);
			expect(session.team.units[0].cardId).toBe("core_a");
		});

		it("generates a random seed when none provided", () => {
			const s1 = SessionManagement.createInitialSession("p1");
			const s2 = SessionManagement.createInitialSession("p1");
			expect(s1.seed).toBeDefined();
			expect(typeof s1.seed).toBe("string");
			// Two calls should produce different seeds
			expect(s1.seed).not.toBe(s2.seed);
		});

		it("has deterministic options for same seed", () => {
			const a = SessionManagement.createInitialSession("p1", undefined, "det-seed");
			const b = SessionManagement.createInitialSession("p1", undefined, "det-seed");
			expect(a.options.map((o) => o.id)).toEqual(b.options.map((o) => o.id));
		});
	});

	describe("updateTeamAction", () => {
		it("repositions units when only positions change", () => {
			const unit1 = makeUnit("u1", [0, 0]);
			const unit2 = makeUnit("u2", [1, 1]);
			const session = makeSession({ team: { units: [unit1, unit2] } });

			const moved1 = { ...unit1, position: [2, 2] as [number, number] };
			const moved2 = { ...unit2, position: [0, 1] as [number, number] };

			const result = SessionManagement.updateTeamAction(session, [moved1, moved2]);
			expect(result.team.units[0].position).toEqual([2, 2]);
			expect(result.team.units[1].position).toEqual([0, 1]);
		});

		it("rejects when unit count changes", () => {
			const unit1 = makeUnit("u1", [0, 0]);
			const session = makeSession({ team: { units: [unit1] } });

			const result = SessionManagement.updateTeamAction(session, [unit1, makeUnit("u2", [1, 1])]);
			// Should return unchanged session
			expect(result.team.units).toHaveLength(1);
		});

		it("rejects when a unit ID is not found", () => {
			const unit1 = makeUnit("u1", [0, 0]);
			const session = makeSession({ team: { units: [unit1] } });

			const result = SessionManagement.updateTeamAction(session, [makeUnit("unknown", [2, 2])]);
			expect(result.team.units[0].id).toBe("u1");
		});

		it("rejects when cardId or rank changes", () => {
			const unit1 = makeUnit("u1", [0, 0]);
			const session = makeSession({ team: { units: [unit1] } });

			const modified = { ...unit1, position: [2, 2] as [number, number], cardId: "different" };
			const result = SessionManagement.updateTeamAction(session, [modified]);
			expect(result.team.units[0].cardId).toBe("card_u1");
		});
	});
});
