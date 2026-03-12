import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import { createServerCombatEffects } from "@Scenes/Battleground/ServerCombatEffects";
import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { applyChargeLogicIO } from "@TriggerSystem/effects/applyCharge";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { Unit } from "@Models/Entities/Unit";

// Mock i18n
jest.mock("../../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => {},
	setLocale: () => {},
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

beforeAll(() => {
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Charge Effect Tests", () => {
	let state: any;
	let effects: any;
	let env: any;
	let sourceUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];

		sourceUnit.charge = 0;
	});

	it("should increase charge on target", () => {
		const amount = 20;

		applyChargeLogicIO(env, sourceUnit, [sourceUnit], amount);

		effects.setFrame(30);

		expect(sourceUnit.charge).toBe(20);

		const chargeLog = effects.logs.find((l: any) => l.type === "charge");
		expect(chargeLog).toBeDefined();
		expect(chargeLog.amount).toBe(amount);
	});
});
