import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import {
	createServerCombatEffects,
	type CombatLogEntry,
} from "@Core/Combat/ServerCombatEffects";
import { runCombat } from "@Core/Combat/RunCombatCore";
import { dealDamageLogicIO } from "@TriggerSystem/effects/dealDamage";
import { processEffectsIO } from "@TriggerSystem/TriggerSystem";
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

let globalState: State;
jest.mock("../../Models/State", () => ({
	getState: () => globalState,
	State: {},
}));

beforeAll(() => {
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Damage Effect Tests", () => {
	let state: State;
	let effects: ReturnType<typeof createServerCombatEffects>;
	let env: CombatEnvironment;
	let sourceUnit: Unit;
	let targetUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		globalState = state;
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];
		targetUnit = state.battleData.units[1]; // Enemy

		sourceUnit.power = 10;
		targetUnit.life = 100;
		targetUnit.maxLife = 100;
		targetUnit.shield = 0;
	});

	it("should deal correct damage to target", () => {
		const initialLife = targetUnit.life;
		sourceUnit.power = 20;

		dealDamageLogicIO(env, sourceUnit);

		effects.setFrame(30);

		const core = state.battleData.units.find(
			(u: Unit) => u.force === targetUnit.force && u.isCore
		)!;
		const damageLog = effects.logs.find((l: CombatLogEntry) => l.type === "damage")!;

		expect(damageLog).toBeDefined();
		expect(damageLog.amount).toBe(20);
		expect(core.life).toBe(initialLife - 20);
	});

	it("should be absorbed by shield", () => {
		sourceUnit.power = 20;
		targetUnit.shield = 15;
		const initialLife = targetUnit.life;

		dealDamageLogicIO(env, sourceUnit);
		effects.setFrame(30);

		expect(targetUnit.shield).toBe(0);
		expect(targetUnit.life).toBe(initialLife - 5);
	});
	it("should trigger reaction on damage", async () => {
		// Setup a reaction on targetUnit: when 'enemies' deal 'damage', trigger 'heal'
		targetUnit.reactions.push({
			effectId: "damage",
			position: "enemies",
			effects: [{ id: "heal" }],
		});

		effects.logs.length = 0;

		// Trigger damage using processEffectsIO to ensure reactions are processed
		processEffectsIO(env, sourceUnit, [{ id: "damage" }], false);

		// Should have damage log
		const damageLog = effects.logs.find((l: CombatLogEntry) => l.type === "damage");
		expect(damageLog).toBeDefined();

		// Verify reaction
		const reactionLog = effects.logs.find(
			(log: CombatLogEntry) => log.type === "heal" && log.delayed === 200
		)!;
		expect(reactionLog).toBeDefined();
		expect(reactionLog.sourceId).toBe(targetUnit.id);
	});
});
