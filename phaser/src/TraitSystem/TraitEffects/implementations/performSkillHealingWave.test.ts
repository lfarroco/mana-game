/**
 * @file Tests for the healing wave skill effect implementation.
 */

import { performSkillHealingWaveLogic } from "./performSkillHealingWave";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillHealingWaveLogic", () => {
  let mockContext: TraitEffectContext;
  let mockSourceUnit: Unit;
  let mockScene: BattlegroundScene;

  beforeEach(() => {
    mockSourceUnit = {
      id: "unit-1",
      name: "Test Unit",
      power: 10,
      maxHealth: 100,
      health: 80,
      cooldown: 1000,
      position: { x: 1, y: 1 },
      force: "player",
      cardId: "test-card"
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

  test("should return source unit and scene for healing wave skill", () => {
    const result = performSkillHealingWaveLogic(mockContext);

    expect(result.sourceUnit).toBe(mockSourceUnit);
    expect(result.scene).toBe(mockScene);
  });

  test("should handle different source units", () => {
    const anotherUnit = {
      id: "unit-2",
      name: "Another Unit",
      power: 20,
      maxHealth: 150,
      health: 150,
      cooldown: 800,
      position: { x: 2, y: 0 },
      force: "cpu",
      cardId: "another-card"
    } as unknown as Unit;

    mockContext.sourceUnit = anotherUnit;

    const result = performSkillHealingWaveLogic(mockContext);

    expect(result.sourceUnit).toBe(anotherUnit);
    expect(result.scene).toBe(mockScene);
  });

  test("should handle different scenes", () => {
    const anotherScene = {
      time: { now: 2000 }
    } as unknown as BattlegroundScene;

    mockContext.scene = anotherScene;

    const result = performSkillHealingWaveLogic(mockContext);

    expect(result.sourceUnit).toBe(mockSourceUnit);
    expect(result.scene).toBe(anotherScene);
  });
});
