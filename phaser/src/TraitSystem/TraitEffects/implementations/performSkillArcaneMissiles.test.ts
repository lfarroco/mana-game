/**
 * @file Tests for the arcane missiles skill effect implementation.
 */

import { performSkillArcaneMissilesLogic } from "./performSkillArcaneMissiles";
import { Unit } from "../../../Models/Entities/Unit";
import BattlegroundScene from "../../../Scenes/Battleground/BattlegroundScene";
import { TraitEffectContext } from "../../TraitEffectSystem";

describe("performSkillArcaneMissilesLogic", () => {
  let mockContext: TraitEffectContext;
  let mockSourceUnit: Unit;
  let mockScene: BattlegroundScene;

  beforeEach(() => {
    mockSourceUnit = {
      id: "unit-1",
      name: "Test Mage",
      power: 15,
      maxHealth: 100,
      health: 100,
      cooldown: 1200,
      position: { x: 1, y: 1 },
      force: "player",
      cardId: "mage-card"
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

  test("should return source unit, scene, and default projectiles", () => {
    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.sourceUnit).toBe(mockSourceUnit);
    expect(result.scene).toBe(mockScene);
    expect(result.projectiles).toBe(3); // Default value
  });

  test("should use projectiles from traitInstanceParams", () => {
    mockContext.traitInstanceParams = { 
      id: "test-trait",
      projectiles: 5 
    } as unknown as any;

    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.projectiles).toBe(5);
  });

  test("should use projectiles from effectInstance when traitInstanceParams missing", () => {
    mockContext.effectInstance = { 
      effectId: "skill_arcane_missiles",
      eventTrigger: "on_combat_start",
      projectiles: 7 
    } as unknown as any;

    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.projectiles).toBe(7);
  });

  test("should prioritize effectInstance over traitInstanceParams", () => {
    mockContext.traitInstanceParams = { 
      id: "test-trait",
      projectiles: 6 
    } as unknown as any;
    mockContext.effectInstance = { 
      effectId: "skill_arcane_missiles",
      eventTrigger: "on_combat_start",
      projectiles: 4 
    } as unknown as any;

    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.projectiles).toBe(4); // effectInstance takes priority
  });

  test("should handle zero projectiles", () => {
    mockContext.traitInstanceParams = { 
      id: "test-trait",
      projectiles: 0 
    } as unknown as any;

    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.projectiles).toBe(0);
  });

  test("should handle different source units", () => {
    const anotherUnit = {
      id: "unit-2",
      name: "Battle Mage",
      power: 20,
      maxHealth: 80,
      health: 80,
      cooldown: 1000,
      position: { x: 0, y: 2 },
      force: "cpu",
      cardId: "battle-mage"
    } as unknown as Unit;

    mockContext.sourceUnit = anotherUnit;
    mockContext.traitInstanceParams = { 
      id: "test-trait",
      projectiles: 8 
    } as unknown as any;

    const result = performSkillArcaneMissilesLogic(mockContext);

    expect(result.sourceUnit).toBe(anotherUnit);
    expect(result.scene).toBe(mockScene);
    expect(result.projectiles).toBe(8);
  });
});
