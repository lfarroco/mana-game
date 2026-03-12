import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import { createServerCombatEffects } from "@Scenes/Battleground/ServerCombatEffects";
import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { addShieldLogicIO } from "@TriggerSystem/effects/addShield";
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

describe("Shield Effect Tests", () => {
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

		sourceUnit.power = 10;
		sourceUnit.shield = 0;
	});

	it("should add shield to ally", async () => {
		sourceUnit.shield = 0;
		sourceUnit.power = 25;

		await addShieldLogicIO(env, sourceUnit);

		effects.setFrame(30);

		const shieldLog = effects.logs.find((l: any) => l.type === "shield");

		expect(shieldLog).toBeDefined();
		expect(shieldLog.amount).toBe(25);
		expect(sourceUnit.shield).toBe(25);

		const shieldDisplayLog = effects.logs.find((l: any) => l.type === "shield_display");
		expect(shieldDisplayLog).toBeDefined();
	});
});
