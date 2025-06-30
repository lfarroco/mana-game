/**
 * @file Tests for the summon skill effect implementation.
 */

import { performSkillSummonLogic } from "./performSkillSummon";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillSummonLogic", () => {
	let mockContext: TraitEffectContext;
	let mockSourceUnit: Unit;
	let mockScene: BattlegroundScene;

	beforeEach(() => {
		mockSourceUnit = {
			id: "unit-1",
			name: "Summoner",
			power: 10,
			maxHealth: 100,
			health: 100,
			cooldown: 1500,
			position: { x: 1, y: 1 },
			force: "player",
			cardId: "summoner-card"
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

	test("should return default values when no cardIdToSummon is provided", () => {
		const result = performSkillSummonLogic(mockContext);

		expect(result.sourceUnit).toBe(mockSourceUnit);
		expect(result.scene).toBe(mockScene);
		expect(result.cardIdToSummon).toBe('');
		expect(result.shouldExecute).toBe(false);
	});

	test("should use cardIdToSummon from traitInstanceParams", () => {
		mockContext.traitInstanceParams = {
			id: "test-trait",
			cardIdToSummon: "skeleton-warrior"
		} as unknown as any;

		const result = performSkillSummonLogic(mockContext);

		expect(result.cardIdToSummon).toBe("skeleton-warrior");
		expect(result.shouldExecute).toBe(true);
	});

	test("should use cardIdToSummon from effectInstance when traitInstanceParams missing", () => {
		mockContext.effectInstance = {
			effectId: "skill_summon",
			eventTrigger: "on_combat_start",
			cardIdToSummon: "fire-elemental"
		} as unknown as any;

		const result = performSkillSummonLogic(mockContext);

		expect(result.cardIdToSummon).toBe("fire-elemental");
		expect(result.shouldExecute).toBe(true);
	});

	test("should prioritize effectInstance over traitInstanceParams", () => {
		mockContext.traitInstanceParams = {
			id: "test-trait",
			cardIdToSummon: "ice-golem"
		} as unknown as any;
		mockContext.effectInstance = {
			effectId: "skill_summon",
			eventTrigger: "on_combat_start",
			cardIdToSummon: "rock-golem"
		} as unknown as any;

		const result = performSkillSummonLogic(mockContext);

		expect(result.cardIdToSummon).toBe("rock-golem"); // effectInstance takes priority
		expect(result.shouldExecute).toBe(true);
	});

	test("should handle empty string cardIdToSummon", () => {
		mockContext.traitInstanceParams = {
			id: "test-trait",
			cardIdToSummon: ""
		} as unknown as any;

		const result = performSkillSummonLogic(mockContext);

		expect(result.cardIdToSummon).toBe("");
		expect(result.shouldExecute).toBe(false);
	});

	test("should handle different source units", () => {
		const necromancer = {
			id: "unit-2",
			name: "Necromancer",
			power: 15,
			maxHealth: 80,
			health: 80,
			cooldown: 1800,
			position: { x: 0, y: 2 },
			force: "cpu",
			cardId: "necromancer"
		} as unknown as Unit;

		mockContext.sourceUnit = necromancer;
		mockContext.traitInstanceParams = {
			id: "test-trait",
			cardIdToSummon: "zombie"
		} as unknown as any;

		const result = performSkillSummonLogic(mockContext);

		expect(result.sourceUnit).toBe(necromancer);
		expect(result.cardIdToSummon).toBe("zombie");
		expect(result.shouldExecute).toBe(true);
	});
});
