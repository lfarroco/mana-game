import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";
import { createMockState } from "@test-utils/serverCombatUtils";
import { createServerCombatEffects } from "@Scenes/Battleground/ServerCombatEffects";
import { runCombat } from "@Scenes/Battleground/RunCombatCore";
import { processEffectsIO } from "@TriggerSystem/TriggerSystem";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "@Data/BaseCollection";
import { Unit, makeUnit } from "@Models/Entities/Unit";

jest.mock("../i18n/i18n", () => ({
	t: (key: string) => key,
	getName: (id: string) => id,
	initialize: () => {},
	setLocale: () => {},
	getCurrentLocale: () => "en",
	getAvailableLocales: () => ["en"],
	getNativeName: () => "English",
}));

let globalState: any;
jest.mock("../Models/State", () => ({
	getState: () => globalState,
	State: {},
}));

beforeAll(() => {
	if (typeof global.structuredClone === "undefined") {
		global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
	}
	registerCollection(BASE_COLLECTION_DATA);
});

describe("Reaction System Tests", () => {
	let state: any;
	let effects: any;
	let env: any;
	let sourceUnit: Unit;
	let chronomancer: Unit;
	let enemyUnit: Unit;

	beforeEach(() => {
		state = createMockState();
		globalState = state;
		effects = createServerCombatEffects(state);
		const runner = runCombat(state, effects);
		env = runner.getEnv();

		sourceUnit = state.battleData.units[0];
		enemyUnit = state.battleData.units[1];

		chronomancer = makeUnit(sourceUnit.force, "chronomancer", { x: 2, y: 1 });
		state.battleData.units.push(chronomancer);
	});

	describe("Haste Reactions", () => {
		it("should trigger chronomancer reaction when ally receives haste", async () => {
			const initialPower = chronomancer.power;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				sourceUnit,
				[
					{
						id: "haste",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			// Force delayed execution (projectile time)
			effects.setFrame(50);

			const hasteLog = effects.logs.find((l: any) => l.type === "haste");
			expect(hasteLog).toBeDefined();

			const reactionLog = effects.logs.find(
				(l: any) => l.type === "reaction" && l.unitId === chronomancer.id
			);
			expect(reactionLog).toBeDefined();

			const powerIncreaseLog = effects.logs.find(
				(l: any) => l.type === "increase_power" && l.sourceId === chronomancer.id
			);
			expect(powerIncreaseLog).toBeDefined();
			expect(chronomancer.power).toBe(initialPower + 7);
		});

		it("should not trigger chronomancer reaction when enemy receives haste", async () => {
			const initialPower = chronomancer.power;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				enemyUnit,
				[
					{
						id: "haste",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			// Advance frame to be safe
			effects.setFrame(50);

			const powerIncreaseLog = effects.logs.find(
				(l: any) => l.type === "increase_power" && l.sourceId === chronomancer.id
			);
			expect(powerIncreaseLog).toBeUndefined();
			expect(chronomancer.power).toBe(initialPower);
		});

		it("should trigger reaction for row_allies position with chaos_knight", async () => {
			const chaosKnight = makeUnit(sourceUnit.force, "chaos_knight", { x: 3, y: 1 });
			chaosKnight.position.y = sourceUnit.position.y;
			state.battleData.units.push(chaosKnight);

			const initialCharge = chaosKnight.charge || 0;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				sourceUnit,
				[
					{
						id: "slow",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			// Advance frame
			effects.setFrame(50);

			expect(chaosKnight.charge).toBeGreaterThan(initialCharge);
		});

		it("should not trigger row_allies reaction when not in same row", async () => {
			const chaosKnight = makeUnit(sourceUnit.force, "chaos_knight", { x: 3, y: 2 });
			chaosKnight.position.y = sourceUnit.position.y + 1;
			state.battleData.units.push(chaosKnight);

			const initialCharge = chaosKnight.charge || 0;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				sourceUnit,
				[
					{
						id: "slow",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			// Advance frame
			effects.setFrame(50);

			expect(chaosKnight.charge).toBe(initialCharge);
		});
	});

	describe("Damage Reactions", () => {
		it("should trigger arbiter reaction when enemy deals damage", async () => {
			const arbiter = makeUnit(sourceUnit.force, "arbiter", { x: 3, y: 1 });
			state.battleData.units.push(arbiter);

			const initialPower = arbiter.power;
			effects.logs.length = 0;

			processEffectsIO(env, enemyUnit, [{ id: "damage" }], false);

			// Advance frame
			effects.setFrame(50);

			const powerIncreaseLog = effects.logs.find(
				(l: any) => l.type === "increase_power" && l.sourceId === arbiter.id
			);
			expect(powerIncreaseLog).toBeDefined();
			expect(arbiter.power).toBe(initialPower + 2);
		});
	});

	describe("Shield Reactions", () => {
		it("should trigger glass_cannon reaction when ally receives shield", async () => {
			const glassCannon = makeUnit(sourceUnit.force, "glass_cannon", { x: 3, y: 1 });
			state.battleData.units.push(glassCannon);

			const initialPower = glassCannon.power;
			effects.logs.length = 0;

			processEffectsIO(env, sourceUnit, [{ id: "shield" }], false);

			// Advance frame
			effects.setFrame(50);

			const powerIncreaseLog = effects.logs.find(
				(l: any) => l.type === "increase_power" && l.sourceId === glassCannon.id
			);
			expect(powerIncreaseLog).toBeDefined();
			expect(glassCannon.power).toBe(initialPower + 5);
		});
	});

	describe("All Effect Reactions", () => {
		it("should trigger harmony_monk reaction on any basic ability", async () => {
			const harmonyMonk = makeUnit(sourceUnit.force, "harmony_monk", {
				x: 2,
				y: sourceUnit.position.y,
			});
			state.battleData.units.push(harmonyMonk);

			const initialChronoPower = chronomancer.power;
			effects.logs.length = 0;

			processEffectsIO(env, sourceUnit, [{ id: "damage" }], false);
			effects.setFrame(50);
			expect(chronomancer.power).toBe(initialChronoPower + 4);

			processEffectsIO(env, sourceUnit, [{ id: "shield" }], false);
			effects.setFrame(100);
			expect(chronomancer.power).toBe(initialChronoPower + 8);

			processEffectsIO(env, sourceUnit, [{ id: "heal" }], false);
			effects.setFrame(150);
			expect(chronomancer.power).toBe(initialChronoPower + 12);
		});

		it('should not trigger "all" reaction on non-basic abilities', async () => {
			const harmonyMonk = makeUnit(sourceUnit.force, "harmony_monk", {
				x: 2,
				y: sourceUnit.position.y,
			});
			state.battleData.units.push(harmonyMonk);

			const initialChronoPower = chronomancer.power;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				sourceUnit,
				[
					{
						id: "charge",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			effects.setFrame(50);

			expect(chronomancer.power).toBe(initialChronoPower);
		});
	});

	describe("Multiple Reactions", () => {
		it("should trigger multiple reactions from different units", async () => {
			const eternalPhoenix = makeUnit(sourceUnit.force, "eternal_phoenix", { x: 3, y: 1 });
			state.battleData.units.push(eternalPhoenix);

			const initialChronoPower = chronomancer.power;
			const initialPhoenixPower = eternalPhoenix.power;
			effects.logs.length = 0;

			processEffectsIO(
				env,
				sourceUnit,
				[
					{
						id: "haste",
						duration: 1000,
						targets: { id: "self" },
					},
				],
				false
			);

			effects.setFrame(50);

			expect(chronomancer.power).toBe(initialChronoPower + 7 + 5);
			expect(eternalPhoenix.power).toBe(initialPhoenixPower);
		});
	});
});
