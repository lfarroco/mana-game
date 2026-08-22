/// <reference types="jest" />

import { planBoardSync, type RenderedUnitState } from "./boardSync";
import * as Card from "../Entities/Card";
import * as Constants from "../math/Constants";
import type { Unit } from "../Models";

function makeTeamUnit(
  cardId: string,
  position: [number, number],
  overrides: Partial<Unit> = {},
): Unit {
  return {
    ...Card.makeUnit(Constants.FORCE_ID_PLAYER, cardId, position),
    ...overrides,
  };
}

function rendered(id: string, power: number, rank: number): RenderedUnitState {
  return { id, power, rank };
}

describe("planBoardSync", () => {
  it("destroys rendered charas whose unit left the team", () => {
    const unitA = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const unitB = makeTeamUnit("living_armor", [1, 0], { id: "b" });
    const plan = planBoardSync(
      [unitA, unitB],
      [
        rendered("a", unitA.power, unitA.rank),
        rendered("b", unitB.power, unitB.rank),
        rendered("gone", 5, 1),
      ],
    );
    expect(plan.toDestroy).toEqual(["gone"]);
    expect(plan.toSummon).toEqual([]);
    expect(plan.toRefresh).toEqual([]);
  });

  it("summons team units that have no rendered chara yet", () => {
    const unitA = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const unitB = makeTeamUnit("living_armor", [1, 0], { id: "b" });
    const plan = planBoardSync(
      [unitA, unitB],
      [rendered("a", unitA.power, unitA.rank)],
    );
    expect(plan.toSummon).toEqual([unitB]);
    expect(plan.toDestroy).toEqual([]);
    expect(plan.toRefresh).toEqual([]);
  });

  it("refreshes a rendered chara when power drifted", () => {
    const unit = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const plan = planBoardSync(
      [unit],
      [rendered("a", unit.power + 10, unit.rank)],
    );
    expect(plan.toRefresh).toEqual([unit]);
    expect(plan.toDestroy).toEqual([]);
    expect(plan.toSummon).toEqual([]);
  });

  it("refreshes a rendered chara when rank drifted", () => {
    const unit = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const plan = planBoardSync(
      [unit],
      [rendered("a", unit.power, unit.rank + 1)],
    );
    expect(plan.toRefresh).toEqual([unit]);
    expect(plan.toDestroy).toEqual([]);
    expect(plan.toSummon).toEqual([]);
  });

  it("leaves a matching chara untouched (no destroy/summon/refresh)", () => {
    const unit = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const plan = planBoardSync([unit], [rendered("a", unit.power, unit.rank)]);
    expect(plan.toDestroy).toEqual([]);
    expect(plan.toSummon).toEqual([]);
    expect(plan.toRefresh).toEqual([]);
  });

  it("returns an empty plan for empty inputs", () => {
    expect(planBoardSync([], [])).toEqual({
      toDestroy: [],
      toSummon: [],
      toRefresh: [],
    });
  });

  it("keeps identical units out of every list even when the diff has work to do", () => {
    const unitA = makeTeamUnit("void_witch", [0, 0], { id: "a" });
    const unitB = makeTeamUnit("living_armor", [1, 0], { id: "b" });
    const plan = planBoardSync(
      [unitA, unitB],
      [
        rendered("a", unitA.power, unitA.rank),
        rendered("b", unitB.power + 100, unitB.rank),
        rendered("gone", 5, 1),
      ],
    );
    expect(plan.toDestroy).toEqual(["gone"]);
    expect(plan.toSummon).toEqual([]);
    expect(plan.toRefresh).toEqual([unitB]);
    expect(plan.toDestroy).not.toContain("a");
    expect(plan.toSummon).not.toContain(unitA);
    expect(plan.toRefresh).not.toContain(unitA);
  });
});
