/**
 * @file Tests for the haste skill effect implementation.
 */

import { performSkillHasteLogic } from "./performSkillHaste";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillHasteLogic", () => {
	let mockContext: TraitEffectContext;
	let mockSourceUnit: Unit;
	let mockScene: BattlegroundScene;

	beforeEach(() => {
		mockSourceUnit = {
			id: "unit-1",
			name: "Test Caster",
			power: 12,
			maxHealth: 90,
			health: 90,
			cooldown: 1000,
			position: { x: 1, y: 1 },
			force: "player",
			cardId: "caster-card"
		} as unknown as Unit;

		mockScene = {
			time: { now: 1000 }
		} as unknown as BattlegroundScene;

		mockContext = {
			sourceUnit: mockSourceUnit,
			scene: mockScene,
			targets: [],
			effectInstance: {},
			traitInstanceParams: {},
			state: {
				battleData: {
					forces: []
				}
			}
		} as unknown as TraitEffectContext;
	});

	test("should return source unit and scene for haste skill", () => {
		const result = performSkillHasteLogic(mockContext);

		expect(result.sourceUnit).toBe(mockSourceUnit);
		expect(result.scene).toBe(mockScene);
	});

	test("should handle different source units", () => {
		const speedUnit = {
			id: "unit-2",
			name: "Speed Demon",
			power: 8,
			maxHealth: 70,
			health: 70,
			cooldown: 600,
			position: { x: 2, y: 0 },
			force: "cpu",
			cardId: "speed-card"
		} as unknown as Unit;

		mockContext.sourceUnit = speedUnit;

		const result = performSkillHasteLogic(mockContext);

		expect(result.sourceUnit).toBe(speedUnit);
		expect(result.scene).toBe(mockScene);
	});

	test("should handle different scenes", () => {
		const fastScene = {
			time: { now: 500 }
		} as unknown as BattlegroundScene;

		mockContext.scene = fastScene;

		const result = performSkillHasteLogic(mockContext);

		expect(result.sourceUnit).toBe(mockSourceUnit);
		expect(result.scene).toBe(fastScene);
	});
});
