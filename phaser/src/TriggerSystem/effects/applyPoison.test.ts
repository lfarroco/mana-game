import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import {
	createServerCombatEffects,
	type CombatLogEntry,
} from "@Core/Combat/ServerCombatEffects";
import { runCombat } from "@Core/Combat/RunCombatCore";
import { applyPoisonLogicIO } from "@TriggerSystem/effects/applyPoison";
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

describe("Poison Effect Tests", () => {
	let state: State;
	let effects: ReturnType<typeof createServerCombatEffects>;
	let env: CombatEnvironment;
	let sourceUnit: Unit;
	let targetUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1];

		sourceUnit.power = 10;
	});

	it("should apply poison to enemy", () => {
		sourceUnit.power = 5;

		applyPoisonLogicIO(env, sourceUnit);

		effects.setFrame(30);

		const poisonRate = env.combatStates.poisonSystemState.poisonRates.get(targetUnit.force);
		expect(poisonRate).toBeCloseTo(0.5);

		const poisonLog = effects.logs.find((l: CombatLogEntry) => l.type === "poison")!;
		expect(poisonLog).toBeDefined();
		expect(poisonLog.amount).toBeCloseTo(0.5);
	});

	it("should stack poison", () => {
		sourceUnit.power = 5;
		applyPoisonLogicIO(env, sourceUnit);
		applyPoisonLogicIO(env, sourceUnit);
		effects.setFrame(30);

		const poisonRate = env.combatStates.poisonSystemState.poisonRates.get(targetUnit.force);
		expect(poisonRate).toBeCloseTo(1.0);
	});
});
