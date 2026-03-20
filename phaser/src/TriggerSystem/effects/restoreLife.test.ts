import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import {
	createServerCombatEffects,
	CombatLogEntry,
} from "@Scenes/Battleground/ServerCombatEffects";
import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { restoreLife } from "@TriggerSystem/effects/restoreLife";
import { processEffectsIO } from "@TriggerSystem/TriggerSystem";
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

describe("Heal Effect Tests", () => {
	let state: State;
	let effects: ReturnType<typeof createServerCombatEffects>;
	let env: CombatEnvironment;
	let sourceUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		globalState = state;
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];

		sourceUnit.power = 10;
		sourceUnit.maxLife = 100;
		sourceUnit.life = 50;
	});

	it("should restore life to ally", async () => {
		sourceUnit.life = 50;
		sourceUnit.maxLife = 100;
		sourceUnit.power = 30;

		await restoreLife(env, sourceUnit);

		effects.setFrame(30);

		const healLog = effects.logs.find((l: CombatLogEntry) => l.type === "heal")!;
		expect(healLog).toBeDefined();
		expect(healLog.amount).toBe(30);
		expect(sourceUnit.life).toBe(80);
	});

	it("should not exceed max life", async () => {
		sourceUnit.life = 90;
		sourceUnit.maxLife = 100;
		sourceUnit.power = 20;

		await restoreLife(env, sourceUnit);

		effects.setFrame(30);

		expect(sourceUnit.life).toBe(100);
	});

	it("should trigger reaction on heal", async () => {
		// Use the enemy unit as the reactor (since source cannot react to self)
		const reactorUnit = state.battleData.units[1];

		// Setup reaction on reactorUnit: when 'enemies' perform 'heal', trigger 'damage'
		reactorUnit.reactions.push({
			effectId: "heal",
			position: "enemies",
			effects: [{ id: "damage" }],
		});

		effects.logs.length = 0;

		// Trigger heal via processEffectsIO
		processEffectsIO(env, sourceUnit, [{ id: "heal" }], false);

		// Check for heal log
		const healLog = effects.logs.find((l: CombatLogEntry) => l.type === "heal");
		expect(healLog).toBeDefined();

		// Check for damage log from reaction
		const damageLog = effects.logs.find(
			(l: CombatLogEntry) => l.type === "damage" && l.delayed === 200
		)!;
		expect(damageLog).toBeDefined();
		expect(damageLog.sourceId).toBe(reactorUnit.id);
	});
});
