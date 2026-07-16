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
import * as Seeding from "@Core/Seeding";
import * as Random from "@Utils/Random";

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

		const damageLogs = result.logs.filter((l) => l.type === "damage");
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
});