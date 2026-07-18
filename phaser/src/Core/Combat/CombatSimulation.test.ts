/**
 * Tests for the pure combat simulation (log generation).
 * These tests run in Jest (jsdom environment) but don't require
 * any browser APIs — the combat logic is pure data transformations.
 */

import * as Card from "@Models/Entities/Card";
import * as BaseCollection from "@Data/BaseCollection";
import * as Unit from "@Models/Entities/Unit";
import * as CombatConstants from "@Core/Combat/CombatConstants";
import * as CombatSimulation from "@Core/Combat/CombatSimulation";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as Seeding from "@game/Seeding";
import * as Random from "@game/Random";
import * as BoardLogic from "@Models/BoardLogic";

beforeAll(() => {
	Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);
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
		if (lastLog.type === "outcome") {
			expect(["player_won", "player_lost", "both_won"]).toContain(lastLog.result);
		}

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
		if (lastLog.type === "outcome") {
			expect(lastLog.result).toBe("player_lost");
		}
	});

	it("player wins when player core has more life than cpu core (500 vs 100)", () => {
		const { session, enemyTeam } = createTestCombat(500, 100);
		const seedVal = Seeding.stringToSeed("test-seed-003");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		if (lastLog.type === "outcome") {
			expect(lastLog.result).toBe("player_won");
		}
	});

	it("both_won when combat times out (both cores alive after max duration)", () => {
		const { session, enemyTeam } = createTestCombat(99999, 99999, 1, 1, "test-seed-004");
		const seedVal = Seeding.stringToSeed("test-seed-004");
		Random.setSeed(seedVal);

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const lastLog = result.logs[result.logs.length - 1];
		expect(lastLog.type).toBe("outcome");
		if (lastLog.type === "outcome") {
			expect(lastLog.result).toBe("both_won");
		}
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
			expect(hit.poisonDelta).toBeDefined();
			expect(typeof hit.poisonDelta).toBe("number");
			expect(hit.poisonDelta).toBeGreaterThan(0);
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
			expect(hit.regenDelta).toBeDefined();
			expect(typeof hit.regenDelta).toBe("number");
			expect(hit.regenDelta).toBeGreaterThan(0);
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

describe("Shield accumulation and damage routing", () => {
	it("shield accumulates across multiple shield_hit log entries", () => {
		const shieldUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "aegis_archon", [1, 0]);
		shieldUnit.cooldown = 100;
		shieldUnit.power = 10; // 10 shield per cast

		const { session, enemyTeam } = createCustomCombat([shieldUnit], 5000, 1, "test-shield-accum-001");
		// Run enough frames for 2+ shield casts to hit
		const logs = simulateCombatForFrames(session, enemyTeam, 100);

		const shieldHits = logs.filter((l) => l.type === "shield_hit");
		expect(shieldHits.length).toBeGreaterThanOrEqual(2);

		// Shield should increase with each hit
		const newShields = shieldHits.map((h) => h.newShield!).filter(s => s !== undefined);
		for (let i = 1; i < newShields.length; i++) {
			expect(newShields[i]).toBeGreaterThan(newShields[i - 1]);
		}
	});

	it("shield_hit entries carry newShield", () => {
		const shieldUnit = Unit.makeUnit(CombatConstants.FORCE_ID_PLAYER, "aegis_archon", [1, 0]);
		shieldUnit.cooldown = 100;

		const { session, enemyTeam } = createCustomCombat([shieldUnit], 5000, 1, "test-shield-new-001");
		const logs = simulateCombatForFrames(session, enemyTeam, 50);

		const shieldHits = logs.filter((l) => l.type === "shield_hit");
		expect(shieldHits.length).toBeGreaterThan(0);

		for (const hit of shieldHits) {
			expect(typeof hit.newShield).toBe("number");
			expect(hit.newShield).toBeGreaterThan(0);
		}
	});

	it("damage_hit carries both newLife and newShield", () => {
		const { session, enemyTeam } = createTestCombat(500, 500);
		Random.setSeed(Seeding.stringToSeed("test-dmg-shield-001"));

		const result = CombatSimulation.simulateCombat(session, enemyTeam);

		const damageHits = result.logs.filter((l) => l.type === "damage_hit");
		expect(damageHits.length).toBeGreaterThan(0);

		for (const hit of damageHits) {
			expect(typeof hit.newLife).toBe("number");
			expect(typeof hit.newShield).toBe("number");
			expect(hit.lifeDelta).toBeDefined();
			expect(typeof hit.lifeDelta).toBe("number");
			expect(hit.lifeDelta).toBeLessThanOrEqual(0); // damage is never positive
		}
	});

});

describe("Haste / Slow status effect log generation", () => {
	it("generates haste_end log when haste duration expires", () => {
		const { session, enemyTeam } = createCustomCombat(
			[],
			5000,
			1,
			"test-haste-end-001",
		);

		const combatState = CombatSimulation.createCombatState(session, enemyTeam);
		const seedVal = Seeding.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const combatRunner = RunCombatCore.runCombat(combatState);
		const env = combatRunner.getEnv();

		const playerCore = combatState.battleData.units.find(
			(u) => u.force === CombatConstants.FORCE_ID_PLAYER && u.isCore,
		)!;
		playerCore.hasted = 50;

		let frame = 0;
		const SIM_DELTA = 16.67;
		while (combatRunner.isActive() && frame < 20) {
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}
		const allLogs = env.logger.getLogs();

		const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
		expect(hasteEndLogs.length).toBe(1);
		expect(hasteEndLogs[0].unitId).toBe(playerCore.id);
		expect(playerCore.hasted).toBeLessThanOrEqual(0);
	});

	it("generates slow_end log when slow duration expires", () => {
		const { session, enemyTeam } = createCustomCombat(
			[],
			5000,
			1,
			"test-slow-end-001",
		);

		const combatState = CombatSimulation.createCombatState(session, enemyTeam);
		const seedVal = Seeding.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const combatRunner = RunCombatCore.runCombat(combatState);
		const env = combatRunner.getEnv();

		const cpuCore = combatState.battleData.units.find(
			(u) => u.force === CombatConstants.FORCE_ID_CPU && u.isCore,
		)!;
		cpuCore.slowed = 50;

		let frame = 0;
		const SIM_DELTA = 16.67;
		while (combatRunner.isActive() && frame < 20) {
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}
		const allLogs = env.logger.getLogs();

		const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");
		expect(slowEndLogs.length).toBe(1);
		expect(slowEndLogs[0].unitId).toBe(cpuCore.id);
		expect(cpuCore.slowed).toBeLessThanOrEqual(0);
	});

	it("generates both haste_end and slow_end when unit has both and they expire", () => {
		const { session, enemyTeam } = createCustomCombat(
			[],
			5000,
			1,
			"test-both-end-001",
		);

		const combatState = CombatSimulation.createCombatState(session, enemyTeam);
		const seedVal = Seeding.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const combatRunner = RunCombatCore.runCombat(combatState);
		const env = combatRunner.getEnv();

		const playerCore = combatState.battleData.units.find(
			(u) => u.force === CombatConstants.FORCE_ID_PLAYER && u.isCore,
		)!;
		playerCore.hasted = 1500;
		playerCore.slowed = 1000;
		playerCore.charge = 0;

		let frame = 0;
		const SIM_DELTA = 16.67;
		while (combatRunner.isActive() && frame < 120) {
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}
		const allLogs = env.logger.getLogs();

		const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
		const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");

		expect(slowEndLogs.length).toBe(1);
		expect(hasteEndLogs.length).toBe(1);
		expect(slowEndLogs[0].timeMs).toBeLessThan(hasteEndLogs[0].timeMs);
		expect(playerCore.hasted).toBeLessThanOrEqual(0);
		expect(playerCore.slowed).toBeLessThanOrEqual(0);
	});

	it("cooldown multiplier is 1 when both hasted and slowed are active", () => {
		const { session, enemyTeam } = createCustomCombat(
			[],
			5000,
			1,
			"test-both-multiplier-001",
		);

		const combatState = CombatSimulation.createCombatState(session, enemyTeam);
		const seedVal = Seeding.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const combatRunner = RunCombatCore.runCombat(combatState);
		const env = combatRunner.getEnv();

		const playerCore = combatState.battleData.units.find(
			(u) => u.force === CombatConstants.FORCE_ID_PLAYER && u.isCore,
		)!;
		playerCore.hasted = 500;
		playerCore.slowed = 500;
		playerCore.charge = 0;
		playerCore.cooldown = 10000;
		playerCore.refresh = 0;

		const SIM_DELTA = 16.67;
		combatRunner.updateFrame(combatState, 0, SIM_DELTA);

		expect(playerCore.charge).toBeCloseTo(SIM_DELTA, 0);
		expect(playerCore.hasted).toBeGreaterThan(0);
		expect(playerCore.slowed).toBeGreaterThan(0);

		const allLogs = env.logger.getLogs();
		const endLogs = allLogs.filter(
			(l) => l.type === "haste_end" || l.type === "slow_end",
		);
		expect(endLogs.length).toBe(0);
	});

	it("no haste_end or slow_end logs when status never applied", () => {
		const { session, enemyTeam } = createCustomCombat(
			[],
			5000,
			1,
			"test-never-applied-001",
		);

		const combatState = CombatSimulation.createCombatState(session, enemyTeam);
		const seedVal = Seeding.stringToSeed(session.initial_seed);
		Random.setSeed(seedVal);

		const combatRunner = RunCombatCore.runCombat(combatState);
		const env = combatRunner.getEnv();

		let frame = 0;
		const SIM_DELTA = 16.67;
		while (combatRunner.isActive() && frame < 30) {
			combatRunner.updateFrame(combatState, frame * SIM_DELTA, SIM_DELTA);
			frame++;
		}
		const allLogs = env.logger.getLogs();

		const hasteEndLogs = allLogs.filter((l) => l.type === "haste_end");
		const slowEndLogs = allLogs.filter((l) => l.type === "slow_end");
		expect(hasteEndLogs.length).toBe(0);
		expect(slowEndLogs.length).toBe(0);
	});
});