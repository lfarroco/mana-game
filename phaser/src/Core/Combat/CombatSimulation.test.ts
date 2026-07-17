/**
 * Tests for the pure combat simulation (log generation).
 * These tests run in Jest (jsdom environment) but don't require
 * any browser APIs — the combat logic is pure data transformations.
 */

import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import * as Unit from "@Models/Entities/Unit";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as CombatSimulation from "@Core/Combat/CombatSimulation";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as Seeding from "@Core/Seeding";
import * as Random from "@Utils/Random";
import * as BoardLogic from "@Models/BoardLogic";

// Mock i18n (needed by some transitive imports)
jest.mock("@i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (key: string) => key,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

if (typeof global.structuredClone === "undefined") {
	global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
}

beforeAll(() => {
	registerCollection(BASE_COLLECTION_DATA);
});

/**
 * Create a minimal session and enemy team for combat testing.
 * Uses "critical_crystal" which has a "damage" effect and isCore: true.
 */
function createTestCombat(
	playerCoreLife: number,
	cpuCoreLife: number,
	playerPower: number = 35,
	cpuPower: number = 35,
	seed: string = "test-seed",
) {
	const playerCore = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "critical_crystal", [0, 0]);
	playerCore.life = playerCoreLife;
	playerCore.maxLife = playerCoreLife;
	playerCore.power = playerPower;
	playerCore.charge = 0;
	playerCore.refresh = 0;

	const cpuCore = Unit.makeUnit(CombatConstants.FORCE_ID_CPU, "critical_crystal", [0, 2]);
	cpuCore.life = cpuCoreLife;
	cpuCore.maxLife = cpuCoreLife;
	cpuCore.power = cpuPower;
	cpuCore.charge = 0;
	cpuCore.refresh = 0;

	const session: import("@Core/Models").SessionData = {
		id: "test-combat-session",
		player_id: "test-player",
		phase: "combat",
		session_type: { type: "singleplayer" },
		round: 1,
		step: 0,
		seed,
		initial_seed: seed,
		options: [],
		team: { units: [playerCore] },
		wins: 0,
		losses: 0,
		action_log: [],
		encounter_history: [],
	};

	return { session, enemyTeam: [cpuCore] };
}

/**
 * Create a test combat with custom player units (including a specific core).
 * Both cores are set with very long cooldowns so they don't fire during tests.
 */
function createCustomCombat(
	playerUnits: Unit.Unit[],
	cpuCoreLife: number = 500,
	cpuCorePower: number = 1,
	seed: string = "test-custom-seed",
) {
	playerUnits.forEach((u) => {
		u.force = CombatConstants.FORCE_ID_PLAYER;
		u.charge = 0;
		u.refresh = 0;
	});

	const hasPlayerCore = playerUnits.some((u) => u.isCore);
	if (!hasPlayerCore) {
		const freeSlot = BoardLogic.findFreeSlot(playerUnits, CombatConstants.FORCE_ID_PLAYER, [1, 1]);
		const core = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "critical_crystal", freeSlot || [1, 1]);
		core.power = 1;
		core.cooldown = 99999;
		playerUnits.push(core);
	} else {
		const playerCore = playerUnits.find((u) => u.isCore)!;
		playerCore.cooldown = 99999;
		playerCore.charge = 0;
	}

	const cpuCore = Unit.makeUnit(CombatConstants.FORCE_ID_CPU, "critical_crystal", [0, 2]);
	cpuCore.life = cpuCoreLife;
	cpuCore.maxLife = cpuCoreLife;
	cpuCore.power = cpuCorePower;
	cpuCore.cooldown = 99999;
	cpuCore.charge = 0;
	cpuCore.refresh = 0;

	const session: import("@Core/Models").SessionData = {
		id: "test-combat-session",
		player_id: "test-player",
		phase: "combat",
		session_type: { type: "singleplayer" },
		round: 1,
		step: 0,
		seed,
		initial_seed: seed,
		options: [],
		team: { units: playerUnits },
		wins: 0,
		losses: 0,
		action_log: [],
		encounter_history: [],
	};

	return { session, enemyTeam: [cpuCore] };
}

/** Run combat for a specific number of frames to control timing precisely. */
function simulateCombatForFrames(
	session: import("@Core/Models").SessionData,
	enemyTeam: Unit.Unit[],
	maxFrames: number,
) {
	const combatState = CombatSimulation.createCombatState(session, enemyTeam);
	const seedVal = Seeding.stringToSeed(session.initial_seed);
	Random.setSeed(seedVal);

	const combatRunner = RunCombatCore.runCombat(combatState);

	const SIM_DELTA = 16.67;
	let frame = 0;

	while (combatRunner.isActive() && frame < maxFrames) {
		combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
		frame++;
	}

	const env = combatRunner.getEnv();
	return env.logger.getLogs();
}

describe("Combat simulation log generation", () => {
	it("generates combat logs when two cores fight (player 100 HP, cpu 200 HP)", () => {
		const { session, enemyTeam } = createTestCombat(100, 200);
		const seedVal = Seeding.stringToSeed("test-seed-001");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		expect(result.logs.length).toBeGreaterThan(0);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		expect(["player_won", "player_lost", "both_won"]).toContain(lastLog.result);

		const damageLogs = result.logs.filter((l) => l.type === "damage_cast");
		expect(damageLogs.length).toBeGreaterThan(0);

		for (const dmg of damageLogs) {
			expect(dmg.sourceId).toBeDefined();
			expect(dmg.targetId).toBeDefined();
			expect(typeof dmg.amount).toBe("number");
			expect(dmg.amount).toBeGreaterThan(0);
		}

		for (let i = 1; i < result.logs.length; i++) {
			expect(result.logs[i].timeMs).toBeGreaterThanOrEqual(result.logs[i - 1].timeMs);
		}
	});

	it("a 100 HP core dies before a 200 HP core (both have same damage)", () => {
		const { session, enemyTeam } = createTestCombat(100, 200);
		const seedVal = Seeding.stringToSeed("test-seed-002");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		expect(lastLog.result).toBe("player_lost");
	});

	it("player wins when player core has more life than cpu core (500 vs 100)", () => {
		const { session, enemyTeam } = createTestCombat(500, 100);
		const seedVal = Seeding.stringToSeed("test-seed-003");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		expect(lastLog.result).toBe("player_won");
	});

	it("both_won when combat times out (both cores alive after max duration)", () => {
		const { session, enemyTeam } = createTestCombat(99999, 99999, 1, 1, "test-seed-004");
		const seedVal = Seeding.stringToSeed("test-seed-004");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		expect(lastLog.result).toBe("both_won");
	});

	it("includes combat_stats log entry", () => {
		const { session, enemyTeam } = createTestCombat(100, 200);
		Random.setSeed(Seeding.stringToSeed("test-seed-005"));

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const statsLog = result.logs.find((l) => l.type === "combat_stats");
		expect(statsLog).toBeDefined();
		expect(statsLog!.unitStats).toBeDefined();
		expect(statsLog!.currentCombatStats).toBeDefined();
	});

	// ---- Cast/Hit split tests ----

	it("damage_cast and damage_hit are logged as separate entries with travelTime", () => {
		const { session, enemyTeam } = createTestCombat(200, 200);
		Random.setSeed(Seeding.stringToSeed("test-seed-010"));

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const castLogs = result.logs.filter((l) => l.type === "damage_cast");
		const hitLogs = result.logs.filter((l) => l.type === "damage_hit");

		expect(castLogs.length).toBeGreaterThan(0);
		expect(hitLogs.length).toBeGreaterThan(0);

		for (const cast of castLogs) {
			expect(typeof cast.travelTime).toBe("number");
			expect(cast.travelTime).toBeGreaterThan(0);
		}

		for (const hit of hitLogs) {
			expect(typeof hit.newLife).toBe("number");
		}

		const match = hitLogs.find((h) => h.sourceId === castLogs[0].sourceId && h.amount === castLogs[0].amount);
		expect(match).toBeDefined();
		expect(match!.targetId).toBe(castLogs[0].targetId);
	});
});

describe("Poison and Regen log entries", () => {
	it("poison_cast and poison_hit are logged when a poison unit acts", () => {
		const poisonUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "plague_incubator", [1, 0]);
		poisonUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([poisonUnit], 5000, 1, "test-poison-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 50);

		const casts = logs.filter((l) => l.type === "poison_cast");
		const hits = logs.filter((l) => l.type === "poison_hit");

		expect(casts.length).toBeGreaterThan(0);
		expect(hits.length).toBeGreaterThan(0);

		for (const cast of casts) {
			expect(cast.travelTime).toBe(200);
			expect(typeof cast.amount).toBe("number");
		}
		for (const hit of hits) {
			expect(typeof hit.newPoison).toBe("number");
		}
	});

	it("regen_cast and regen_hit are logged when a regen unit acts", () => {
		const regenUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "life_weaver", [1, 0]);
		regenUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([regenUnit], 5000, 1, "test-regen-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 50);

		const casts = logs.filter((l) => l.type === "regen_cast");
		const hits = logs.filter((l) => l.type === "regen_hit");

		expect(casts.length).toBeGreaterThan(0);
		expect(hits.length).toBeGreaterThan(0);

		for (const hit of hits) {
			expect(typeof hit.newRegen).toBe("number");
		}
	});

	it("poison_tick entries appear at ~1s intervals after poison is applied", () => {
		const poisonUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "plague_incubator", [1, 0]);
		poisonUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([poisonUnit], 5000, 1, "test-poison-tick-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 150);

		const ticks = logs.filter((l) => l.type === "poison_tick");
		expect(ticks.length).toBeGreaterThan(0);

		for (const tick of ticks) {
			expect(tick.force).toBeDefined();
			expect(typeof tick.amount).toBe("number");
			expect(tick.amount).toBeGreaterThan(0);
			expect(typeof tick.newLife).toBe("number");
		}

		if (ticks.length >= 2) {
			const interval = ticks[1].timeMs - ticks[0].timeMs;
			expect(interval).toBeGreaterThanOrEqual(900);
			expect(interval).toBeLessThanOrEqual(1100);
		}
	});

	it("regen_tick entries appear at ~1s intervals after regen is applied", () => {
		const regenUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "life_weaver", [1, 0]);
		regenUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([regenUnit], 5000, 1, "test-regen-tick-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 150);

		const ticks = logs.filter((l) => l.type === "regen_tick");
		expect(ticks.length).toBeGreaterThan(0);

		for (const tick of ticks) {
			expect(tick.force).toBeDefined();
			expect(typeof tick.amount).toBe("number");
			expect(tick.amount).toBeGreaterThan(0);
			expect(typeof tick.newLife).toBe("number");
		}

		if (ticks.length >= 2) {
			const interval = ticks[1].timeMs - ticks[0].timeMs;
			expect(interval).toBeGreaterThanOrEqual(900);
			expect(interval).toBeLessThanOrEqual(1100);
		}
	});

	it("poison_hit arrives exactly 200ms after poison_cast (travelTime respected)", () => {
		const poisonUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "plague_incubator", [1, 0]);
		poisonUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([poisonUnit], 5000, 1, "test-poison-travel-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 50);

		const casts = logs.filter((l) => l.type === "poison_cast");
		const hits = logs.filter((l) => l.type === "poison_hit");

		for (const cast of casts) {
			const match = hits.find((h) =>
				h.sourceId === cast.sourceId && h.amount === cast.amount && h.timeMs > cast.timeMs
			);
			if (match) {
				const delay = match.timeMs - cast.timeMs;
				expect(delay).toBeGreaterThanOrEqual(180);
				expect(delay).toBeLessThanOrEqual(220);
			}
		}
	});

	it("newLife field tracks poison tick damage correctly", () => {
		const poisonUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "plague_incubator", [1, 0]);
		poisonUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([poisonUnit], 5000, 1, "test-poison-life-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 200);

		const ticks = logs.filter((l) => l.type === "poison_tick");
		if (ticks.length >= 2) {
			expect(ticks[1].newLife!).toBeLessThan(ticks[0].newLife!);
		}
	});

});