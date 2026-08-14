/// <reference types="jest" />

import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import type { CombatState } from "../types/combat";
import type { Unit } from "../types/unit";
import { applyLogEntryToCombatState } from "./applyLogEntryToCombatState";

afterAll(() => {
  Card.resetCardsMap();
});

const makeUnit = (): Unit => {
  const unit = Card.makeUnit(Constants.FORCE_ID_PLAYER, "mana_crystal", [0, 0]);
  unit.power = 10;
  unit.bonusPower = 2;
  unit.charge = 0;
  unit.hasted = 0;
  unit.slowed = 0;
  return unit;
};

const makeCombatState = (unit: Unit): CombatState => {
  return { unitById: new Map([["u1", unit]]) } as unknown as CombatState;
};

describe("applyLogEntryToCombatState", () => {
  it("haste_hit adds effectDuration to hasted", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "haste_hit",
      sourceId: "s1",
      targetId: "u1",
      effectDuration: 500,
    });

    expect(unit.hasted).toBe(500);
  });

  it("slow_hit adds effectDuration to slowed", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "slow_hit",
      sourceId: "s1",
      targetId: "u1",
      effectDuration: 300,
    });

    expect(unit.slowed).toBe(300);
  });

  it("charge_hit adds amount to charge", () => {
    const unit = makeUnit();
    unit.charge = 40;
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "charge_hit",
      sourceId: "s1",
      targetId: "u1",
      amount: 25,
    });

    expect(unit.charge).toBe(65);
  });

  it("haste_end zeroes hasted", () => {
    const unit = makeUnit();
    unit.hasted = 400;
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, { type: "haste_end", unitId: "u1" });

    expect(unit.hasted).toBe(0);
  });

  it("slow_end zeroes slowed", () => {
    const unit = makeUnit();
    unit.slowed = 400;
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, { type: "slow_end", unitId: "u1" });

    expect(unit.slowed).toBe(0);
  });

  it("increase_power (permanent false) adds amount to power only", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "increase_power",
      targetId: "u1",
      amount: 5,
      permanent: false,
    });

    expect(unit.power).toBe(15);
    expect(unit.bonusPower).toBe(2);
  });

  it("increase_power (permanent true) also adds to bonusPower", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "increase_power",
      targetId: "u1",
      amount: 5,
      permanent: true,
    });

    expect(unit.power).toBe(15);
    expect(unit.bonusPower).toBe(7);
  });

  it("decrease_power subtracts amount from power via affectedUnitId", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "decrease_power",
      targetId: "u1",
      affectedUnitId: "u1",
      amount: 4,
      permanent: false,
    });

    expect(unit.power).toBe(6);
    expect(unit.bonusPower).toBe(2);
  });

  it("decrease_power (permanent true) also subtracts bonusPower", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "decrease_power",
      targetId: "u1",
      affectedUnitId: "u1",
      amount: 4,
      permanent: true,
    });

    expect(unit.power).toBe(6);
    expect(unit.bonusPower).toBe(-2);
  });

  it("damage_hit log entry is a no-op (unit unchanged)", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    applyLogEntryToCombatState(combatState, {
      type: "damage_hit",
      sourceId: "s1",
      targetId: "u1",
      amount: 3,
      newLife: 47,
      lifeDelta: -3,
      newShield: 0,
      shieldDelta: 0,
    });

    expect(unit.power).toBe(10);
    expect(unit.bonusPower).toBe(2);
    expect(unit.hasted).toBe(0);
    expect(unit.slowed).toBe(0);
    expect(unit.charge).toBe(0);
  });

  it("a log targeting a missing unit id does not throw", () => {
    const unit = makeUnit();
    const combatState = makeCombatState(unit);

    expect(() =>
      applyLogEntryToCombatState(combatState, {
        type: "haste_hit",
        sourceId: "s1",
        targetId: "missing",
        effectDuration: 500,
      }),
    ).not.toThrow();

    expect(unit.hasted).toBe(0);
  });
});
