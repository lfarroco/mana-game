import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import {
	createServerCombatEffects,
	CombatLogEntry,
} from "@Scenes/Battleground/ServerCombatEffects";
import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { applyRegenLogicIO } from "@TriggerSystem/effects/applyRegen";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { Unit } from "@Models/Entities/Unit";
import { State } from "@Models/State";
import { CombatEnvironment } from "@Scenes/Battleground/CombatEnvironment";

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
		global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Regen Effect Tests", () => {
	let state: State;
	let effects: ReturnType<typeof createServerCombatEffects>;
	let env: CombatEnvironment;
	let sourceUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];

		sourceUnit.power = 10;
	});

	it("should apply regen to ally", () => {
		sourceUnit.power = 7;

		applyRegenLogicIO(env, sourceUnit);

		effects.setFrame(30);

		const regenRate = env.combatStates.regenSystemState.regenRates.get(sourceUnit.force);
		expect(regenRate).toBeCloseTo(0.7);

		const regenLog = effects.logs.find((l: CombatLogEntry) => l.type === "regen")!;
		expect(regenLog).toBeDefined();
		expect(regenLog.amount).toBeCloseTo(0.7);
	});
});
