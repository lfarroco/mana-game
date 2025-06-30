/**
 * @file Tests for the fireball skill effect implementation.
 */

import { performSkillFireballLogic } from "./performSkillFireball";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillFireballLogic", () => {
	let mockContext: TraitEffectContext;
	let mockSourceUnit: Unit;
	let mockScene: BattlegroundScene;

	beforeEach(() => {
		mockSourceUnit = {
			id: "unit-1",
			name: "Fire Mage",
			power: 18,
			maxHealth: 90,
			health: 90,
			cooldown: 1200,
			position: { x: 2, y: 1 },
			force: "player",
			cardId: "fire-mage-card"
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

	test("should return source unit and scene for fireball skill", () => {
		const result = performSkillFireballLogic(mockContext);

		expect(result.sourceUnit).toBe(mockSourceUnit);
		expect(result.scene).toBe(mockScene);
	});

	test("should handle different source units", () => {
		const pyromaniac = {
			id: "unit-2",
			name: "Pyromaniac",
			power: 22,
			maxHealth: 75,
			health: 75,
			cooldown: 1000,
			position: { x: 1, y: 0 },
			force: "cpu",
			cardId: "pyromaniac"
		} as unknown as Unit;

		mockContext.sourceUnit = pyromaniac;

		const result = performSkillFireballLogic(mockContext);

		expect(result.sourceUnit).toBe(pyromaniac);
		expect(result.scene).toBe(mockScene);
	});

	test("should handle different scenes", () => {
		const blazingScene = {
			time: { now: 3000 }
		} as unknown as BattlegroundScene;

		mockContext.scene = blazingScene;

		const result = performSkillFireballLogic(mockContext);

		expect(result.sourceUnit).toBe(mockSourceUnit);
		expect(result.scene).toBe(blazingScene);
	});
});
