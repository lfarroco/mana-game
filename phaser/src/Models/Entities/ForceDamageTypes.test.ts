import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { createMockState } from "@test-utils/serverCombatUtils";
import { State } from "@Models/State";
import { applyDamageToForce, Force } from "@Models/Entities/Force";

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

describe("Force damage type isolation", () => {
	let state: State;
	let playerForce: Force;
	let cpuForce: Force;

	beforeEach(() => {
		state = createMockState();
		playerForce = state.battleData.forces.find((f) => f.id === state.session.player_id)!;
		cpuForce = state.battleData.forces.find((f) => f.id !== state.session.player_id)!;
	});

	it("normal damage is absorbed by shield before life", () => {
		const cpuCore = state.battleData.units.find((u) => u.force === cpuForce.id && u.isCore)!;
		cpuCore.shield = 30;
		cpuCore.life = 100;

		const lifeDamage = applyDamageToForce(state, cpuForce, 20, 0, "normal");

		expect(lifeDamage).toBe(0);
		expect(cpuCore.shield).toBe(10);
		expect(cpuCore.life).toBe(100);
	});

	it("poison damage bypasses shield and hits life directly", () => {
		const cpuCore = state.battleData.units.find((u) => u.force === cpuForce.id && u.isCore)!;
		cpuCore.shield = 30;
		cpuCore.life = 100;

		const lifeDamage = applyDamageToForce(state, cpuForce, 20, 0, "poison");

		expect(lifeDamage).toBe(20);
		expect(cpuCore.shield).toBe(30);
		expect(cpuCore.life).toBe(80);
	});

	it("timeout damage follows normal shield-then-life flow", () => {
		const playerCore = state.battleData.units.find((u) => u.force === playerForce.id && u.isCore)!;
		playerCore.shield = 15;
		playerCore.life = 100;

		const lifeDamage = applyDamageToForce(state, playerForce, 20, 0, "timeout");

		expect(lifeDamage).toBe(5);
		expect(playerCore.shield).toBe(0);
		expect(playerCore.life).toBe(95);
	});
});
