/// <reference types="jest" />

import * as CombatStatsTracker from "../Combat/CombatStatsTracker";
import * as Models from "../Models";

function makeUnit(id: string, force: string): Models.Unit {
	return {
		id,
		cardId: "test",
		pic: "test",
		force,
		position: [0, 0],
		power: 10,
		cooldown: 1000,
		evade: 0,
		rank: 1,
		effects: [],
		reactions: [],
		charge: 0,
		refresh: 0,
		hasted: 0,
		slowed: 0,
		isCore: false,
		life: 100,
		maxLife: 100,
		critical: 0,
		shield: 0,
		bonusPower: 0,
	};
}

function makeCombatState(units: Models.Unit[]): Models.CombatState {
	const unitById = new Map(units.map((u) => [u.id, u]));
	const playerCore = units.find((u) => u.force === "PLAYER" && u.isCore) || units[0];
	const cpuCore = units.find((u) => u.force === "CPU" && u.isCore) || units[0];
	return {
		units,
		logs: [],
		enemyPlayerName: "CPU",
		wonCombat: false,
		finalPlayerUnits: [],
		initialUnits: [],
		unitById,
		playerCore,
		cpuCore,
		playerUnits: units.filter((u) => u.force === "PLAYER"),
		cpuUnits: units.filter((u) => u.force === "CPU"),
	};
}

describe("CombatStatsTracker", () => {
	describe("initialize", () => {
		it("creates unitStats for all units", () => {
			const units = [makeUnit("u1", "PLAYER"), makeUnit("u2", "CPU")];
			const state = makeCombatState(units);
			const tracker = CombatStatsTracker.initialize(state);
			expect(tracker.unitStats.size).toBe(2);
			expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(0);
			expect(tracker.unitStats.get("u1")!.damageDealt).toBe(0);
		});
	});

	describe("trackAction", () => {
		it("increments actions performed", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackAction(tracker, { unit: u });
			expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(1);
			CombatStatsTracker.trackAction(tracker, { unit: u });
			expect(tracker.unitStats.get("u1")!.actionsPerformed).toBe(2);
		});
	});

	describe("getUnitStats", () => {
		it("returns unit stats by id", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			const stats = CombatStatsTracker.getUnitStats(tracker, "u1");
			expect(stats!.unitId).toBe("u1");
		});

		});

	describe("trackDamage / trackHeal / trackPoison / trackRegen / trackShield", () => {
		it("tracks damage dealt", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "u1", 50);
			expect(tracker.unitStats.get("u1")!.damageDealt).toBe(50);
		});

		it("ignores zero or negative amounts", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "u1", 0);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "u1", -10);
			expect(tracker.unitStats.get("u1")!.damageDealt).toBe(0);
		});

		it("tracks heal", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackHeal(tracker, {} as Models.CombatEnvironment, "u1", 30);
			expect(tracker.unitStats.get("u1")!.healingDone).toBe(30);
		});

		it("tracks poison", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackPoison(tracker, {} as Models.CombatEnvironment, "u1", 15);
			expect(tracker.unitStats.get("u1")!.poisonApplied).toBe(15);
		});

		it("tracks regen", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackRegen(tracker, {} as Models.CombatEnvironment, "u1", 8);
			expect(tracker.unitStats.get("u1")!.regenApplied).toBe(8);
		});

		it("tracks shield", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackShield(tracker, {} as Models.CombatEnvironment, "u1", 20);
			expect(tracker.unitStats.get("u1")!.shieldGranted).toBe(20);
		});

		it("accumulates stats across multiple calls", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "u1", 10);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "u1", 20);
			CombatStatsTracker.trackHeal(tracker, {} as Models.CombatEnvironment, "u1", 5);
			CombatStatsTracker.trackHeal(tracker, {} as Models.CombatEnvironment, "u1", 15);
			expect(tracker.unitStats.get("u1")!.damageDealt).toBe(30);
			expect(tracker.unitStats.get("u1")!.healingDone).toBe(20);
		});
	});

	describe("stop", () => {
		it("populates session runStats from tracker state", () => {
			const pc = { ...makeUnit("p", "PLAYER"), isCore: true, power: 100 };
			const units = [pc];
			const state = makeCombatState(units);
			const tracker = CombatStatsTracker.initialize(state);
			CombatStatsTracker.trackDamage(tracker, {} as Models.CombatEnvironment, "p", 30);

			const session: Models.SessionData = {
				id: "s1",
				player_id: "p1",
				phase: "combat",
				session_type: { type: "singleplayer" },
				round: 1,
				step: 0,
				seed: "s",
				initial_seed: "s",
				options: [],
				team: { units },
				wins: 0,
				losses: 0,
				action_log: [],
			};
			CombatStatsTracker.stop(tracker, session);
			expect(session.runStats).toBeDefined();
			expect(session.runStats!.damageDealt).toBe(30);
			expect(session.runStats!.mostPowerfulUnit).toEqual({ cardId: "test", power: 100 });
		});

		it("creates new runStats when undefined", () => {
			const u = makeUnit("u1", "PLAYER");
			const state = makeCombatState([u]);
			const tracker = CombatStatsTracker.initialize(state);

			const session: Models.SessionData = {
				id: "s2",
				player_id: "p2",
				phase: "combat",
				session_type: { type: "singleplayer" },
				round: 1,
				step: 0,
				seed: "s",
				initial_seed: "s",
				options: [],
				team: { units: [u] },
				wins: 0,
				losses: 0,
				action_log: [],
			};
			CombatStatsTracker.stop(tracker, session);
			expect(session.runStats!.damageDealt).toBe(0);
			expect(session.runStats!.poisonDealt).toBe(0);
			expect(session.runStats!.shieldDealt).toBe(0);
			expect(session.runStats!.regenDealt).toBe(0);
			expect(session.runStats!.healDealt).toBe(0);
		});
	});
});
