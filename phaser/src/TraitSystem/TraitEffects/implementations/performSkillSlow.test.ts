/**
 * @file Tests for the slow skill effect implementation.
 */

import { performSkillSlowLogic } from "./performSkillSlow";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillSlowLogic", () => {
  let mockContext: TraitEffectContext;
  let mockSourceUnit: Unit;
  let mockScene: BattlegroundScene;

  beforeEach(() => {
    mockSourceUnit = {
      id: "unit-1",
      name: "Frost Mage",
      power: 14,
      maxHealth: 85,
      health: 85,
      cooldown: 1100,
      position: { x: 1, y: 2 },
      force: "player",
      cardId: "frost-mage-card"
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

  test("should return source unit and scene for slow skill", () => {
    const result = performSkillSlowLogic(mockContext);

    expect(result.sourceUnit).toBe(mockSourceUnit);
    expect(result.scene).toBe(mockScene);
  });

  test("should handle different source units", () => {
    const iceWizard = {
      id: "unit-2",
      name: "Ice Wizard",
      power: 16,
      maxHealth: 100,
      health: 100,
      cooldown: 1300,
      position: { x: 0, y: 1 },
      force: "cpu",
      cardId: "ice-wizard"
    } as unknown as Unit;

    mockContext.sourceUnit = iceWizard;

    const result = performSkillSlowLogic(mockContext);

    expect(result.sourceUnit).toBe(iceWizard);
    expect(result.scene).toBe(mockScene);
  });

  test("should handle different scenes", () => {
    const frozenScene = {
      time: { now: 2000 }
    } as unknown as BattlegroundScene;

    mockContext.scene = frozenScene;

    const result = performSkillSlowLogic(mockContext);

    expect(result.sourceUnit).toBe(mockSourceUnit);
    expect(result.scene).toBe(frozenScene);
  });
});
