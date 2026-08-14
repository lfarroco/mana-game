/// <reference types="jest" />

import type { CombatLogEntry } from "./CombatLogger";
import { collapseStatusTickPairs } from "./collapseStatusTickPairs";

const poisonTick = (
  timeMs: number,
  force: string,
  amount: number,
  newLife: number,
  lifeDelta: number,
): CombatLogEntry => ({ type: "poison_tick", force, amount, newLife, lifeDelta, timeMs });

const regenTick = (
  timeMs: number,
  force: string,
  amount: number,
  newLife: number,
  lifeDelta: number,
): CombatLogEntry => ({ type: "regen_tick", force, amount, newLife, lifeDelta, timeMs });

describe("collapseStatusTickPairs", () => {
  it("collapses a poison+regen pair for the same force/time into one net entry", () => {
    const logs = [poisonTick(1000, "player", 10, 490, -10), regenTick(1000, "player", 12, 502, 12)];

    const [merged] = collapseStatusTickPairs(logs);

    expect(collapseStatusTickPairs(logs)).toHaveLength(1);
    expect(merged).toMatchObject({ type: "regen_tick", newLife: 502, lifeDelta: 2, amount: 2 });
  });

  it("produces a negative net delta when poison outweighs regen", () => {
    const logs = [poisonTick(1000, "player", 10, 490, -10), regenTick(1000, "player", 5, 495, 5)];

    const [merged] = collapseStatusTickPairs(logs);

    expect(merged).toMatchObject({ lifeDelta: -5 });
  });

  it("collapses pairs for both forces independently", () => {
    const logs = [
      poisonTick(1000, "player", 10, 490, -10),
      regenTick(1000, "player", 12, 502, 12),
      poisonTick(1000, "cpu", 8, 192, -8),
      regenTick(1000, "cpu", 4, 196, 4),
    ];

    const collapsed = collapseStatusTickPairs(logs);

    expect(collapsed).toHaveLength(2);
    expect(collapsed[0]).toMatchObject({ force: "player", newLife: 502, lifeDelta: 2 });
    expect(collapsed[1]).toMatchObject({ force: "cpu", newLife: 196, lifeDelta: -4 });
  });

  it("leaves poison-only ticks unchanged", () => {
    const logs = [poisonTick(1000, "cpu", 10, 490, -10)];

    expect(collapseStatusTickPairs(logs)).toEqual(logs);
  });

  it("leaves regen-only ticks unchanged", () => {
    const logs = [regenTick(1000, "player", 12, 512, 12)];

    expect(collapseStatusTickPairs(logs)).toEqual(logs);
  });

  it("does not merge a pair for the same force at different times", () => {
    const logs = [poisonTick(1000, "player", 10, 490, -10), regenTick(2000, "player", 12, 502, 12)];

    expect(collapseStatusTickPairs(logs)).toEqual(logs);
  });

  it("does not merge entries for different forces at the same time", () => {
    const logs = [poisonTick(1000, "player", 10, 490, -10), regenTick(1000, "cpu", 12, 512, 12)];

    expect(collapseStatusTickPairs(logs)).toEqual(logs);
  });

  it("preserves unrelated logs around a merged pair", () => {
    const damageHit: CombatLogEntry = {
      type: "damage_hit",
      sourceId: "unit-1",
      targetId: "player-core",
      amount: 5,
      newLife: 485,
      lifeDelta: -5,
      newShield: 0,
      shieldDelta: 0,
      timeMs: 500,
    };
    const logs = [
      damageHit,
      poisonTick(1000, "player", 10, 490, -10),
      regenTick(1000, "player", 12, 502, 12),
      poisonTick(2000, "player", 10, 492, -10),
    ];

    const collapsed = collapseStatusTickPairs(logs);

    expect(collapsed).toHaveLength(3);
    expect(collapsed[0]).toEqual(damageHit);
    expect(collapsed[1]).toMatchObject({
      type: "regen_tick",
      force: "player",
      newLife: 502,
      lifeDelta: 2,
    });
    expect(collapsed[2]).toEqual(poisonTick(2000, "player", 10, 492, -10));
  });

  it("returns an empty array for empty input", () => {
    expect(collapseStatusTickPairs([])).toEqual([]);
  });
});
