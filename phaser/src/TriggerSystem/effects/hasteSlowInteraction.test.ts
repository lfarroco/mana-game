import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import {
	createServerCombatEffects,
	type CombatLogEntry,
} from "@Core/Combat/ServerCombatEffects";
import { runCombat, CombatRunner } from "@Core/Combat/RunCombatCore";
import { applyHasteLogicIO } from "@TriggerSystem/effects/applyHaste";
import { applySlowLogicIO } from "@TriggerSystem/effects/applySlow";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";
import { CombatEnvironment } from "@Core/Combat/CombatTypes";

// Mock i18n
jest.mock("../../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => { },
	setLocale: () => { },
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

beforeAll(() => {
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Haste & Slow Interaction Tests", () => {
	let state: State;
	let effects: ReturnType<typeof createServerCombatEffects>;
	let env: CombatEnvironment;
	let sourceUnit: Unit;
	let targetUnit: Unit;
	let combatRunner: CombatRunner;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		combatRunner = runCombat(state, effects);
		env = combatRunner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1];

		targetUnit.hasted = 0;
		targetUnit.slowed = 0;
		targetUnit.charge = 0;
		targetUnit.cooldown = 100000;
	});

	it("should have normal charge rate when both active", async () => {
		const duration = 5000;
		const delta = 10;

		// Apply both effects
		await applyHasteLogicIO(env, [targetUnit], sourceUnit, duration, () => { });
		await applySlowLogicIO(env, sourceUnit, [targetUnit], duration, () => { });

		// Force apply delayed effects (projectile time)
		effects.setFrame(100);

		expect(targetUnit.hasted).toBe(duration);
		expect(targetUnit.slowed).toBe(duration);

		// Advance 1 frame (10ms)
		// Normal rate = 1x. Haste (2x) + Slow (0.5x) => 1x (neutralized)

		combatRunner.updateFrame(state, 0, delta);

		// Normal charge increase for 10ms delta is 10.
		expect(targetUnit.charge).toBeCloseTo(10);
	});

	it("should emit correct logs for overlapping effects", async () => {
		const hasteDuration = 1000;
		const slowDuration = 500;
		const delta = 10;
		let currentFrame = 0;

		// T=0: Apply Haste
		await applyHasteLogicIO(env, [targetUnit], sourceUnit, hasteDuration, () => { });
		// Force apply
		currentFrame += 50;
		effects.setFrame(currentFrame);

		// Expect haste log
		const hasteLog = effects.logs.find((l: CombatLogEntry) => l.type === "haste");
		expect(hasteLog).toBeDefined();

		effects.logs.length = 0; // Clear logs to isolate checks

		// Advance 200ms
		for (let i = 0; i < 20; i++) combatRunner.updateFrame(state, 0, delta);

		// T=200: Apply Slow
		await applySlowLogicIO(env, sourceUnit, [targetUnit], slowDuration, () => { });
		// Force apply
		currentFrame += 50;
		effects.setFrame(currentFrame);

		// Expect slow log
		const slowLog = effects.logs.find((l: CombatLogEntry) => l.type === "slow");
		expect(slowLog).toBeDefined();

		effects.logs.length = 0;

		// Advance 500ms (Slow duration)
		// Note: applySlowLogicIO doesn't advance time, we must do it manually via updateFrame loops
		// The check for expiration happens inside updateFrame when unit.slowed <= 0

		// We need to advance 500ms.
		for (let i = 0; i < 50; i++) combatRunner.updateFrame(state, 0, delta);

		// Now (T=700), Slow should have expired.
		const slowEndLog = effects.logs.find((l: CombatLogEntry) => l.type === "slow_end")!;
		expect(slowEndLog).toBeDefined();
		expect(slowEndLog.unitId).toBe(targetUnit.id);

		// Verify Haste is NOT ended yet (Duration 1000, Elapsed 700)
		const hasteEndLogEarly = effects.logs.find((l: CombatLogEntry) => l.type === "haste_end");
		expect(hasteEndLogEarly).toBeUndefined();

		effects.logs.length = 0;

		// Advance remaining 300ms (Total 1000 - 200 - 500 = 300)
		for (let i = 0; i < 30; i++) combatRunner.updateFrame(state, 0, delta);

		// Now T=1000, Haste should expire
		const hasteEndLog = effects.logs.find((l: CombatLogEntry) => l.type === "haste_end")!;
		expect(hasteEndLog).toBeDefined();
		expect(hasteEndLog.unitId).toBe(targetUnit.id);
	});

	it("should emit correct logs for slow then short haste", async () => {
		const slowDuration = 1000;
		const hasteDuration = 500;
		const delta = 10;
		let currentFrame = 200; // Start offset to avoid conflict with previous test if state shared (it's not)

		// T=0: Apply Slow
		await applySlowLogicIO(env, sourceUnit, [targetUnit], slowDuration, () => { });
		// Force apply
		currentFrame += 50;
		effects.setFrame(currentFrame);

		const slowLog = effects.logs.find((l: CombatLogEntry) => l.type === "slow");
		expect(slowLog).toBeDefined();

		effects.logs.length = 0;

		// Advance 200ms
		for (let i = 0; i < 20; i++) combatRunner.updateFrame(state, 0, delta);

		// T=200: Apply Haste
		await applyHasteLogicIO(env, [targetUnit], sourceUnit, hasteDuration, () => { });
		// Force apply
		currentFrame += 50;
		effects.setFrame(currentFrame);

		const hasteLog = effects.logs.find((l: CombatLogEntry) => l.type === "haste");
		expect(hasteLog).toBeDefined();

		effects.logs.length = 0;

		// Advance 500ms (Haste Duration)
		for (let i = 0; i < 50; i++) combatRunner.updateFrame(state, 0, delta);

		// T=700: Haste should expire.
		const hasteEndLog = effects.logs.find((l: CombatLogEntry) => l.type === "haste_end")!;
		expect(hasteEndLog).toBeDefined();
		expect(hasteEndLog.unitId).toBe(targetUnit.id);

		// Verify Slow is not ended yet
		const slowEndLogEarly = effects.logs.find((l: CombatLogEntry) => l.type === "slow_end");
		expect(slowEndLogEarly).toBeUndefined();

		effects.logs.length = 0;

		// Advance remaining 300ms (Total 1000 - 200 - 500 = 300)
		for (let i = 0; i < 30; i++) combatRunner.updateFrame(state, 0, delta);

		// T=1000: Slow should expire
		const slowEndLog = effects.logs.find((l: CombatLogEntry) => l.type === "slow_end")!;
		expect(slowEndLog).toBeDefined();
		expect(slowEndLog.unitId).toBe(targetUnit.id);
	});
});
