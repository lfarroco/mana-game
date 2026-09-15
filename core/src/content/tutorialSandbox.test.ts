/// <reference types="jest" />

import {
  castInSandbox,
  createSandboxState,
  findSandboxAbility,
  isSandboxDefeated,
  previewAbsorption,
  tickStatus,
  type SandboxAbility,
  type SandboxState,
} from "./tutorialSandbox";
import { isNone, isSome } from "../Functional";

/**
 * A 500-life crystal. `life` overrides the *current* life only — max life stays
 * 500 unless a test says otherwise, so heal/regen caps are exercised.
 */
const crystal = (
  overrides: Partial<Parameters<typeof createSandboxState>[0]> = {},
) =>
  createSandboxState({
    ...overrides,
    maxLife: overrides.maxLife ?? 500,
    life: overrides.life ?? 500,
  });

const ability = (over: Partial<SandboxAbility> = {}): SandboxAbility => ({
  id: "damage",
  kind: "damage",
  power: 50,
  color: "damage",
  ...over,
});

describe("tutorial sandbox", () => {
  describe("createSandboxState", () => {
    it("defaults max life to the starting life and clamps life to it", () => {
      const state = createSandboxState({ life: 400 });
      expect(state.maxLife).toBe(400);
      expect(state.life).toBe(400);
      expect(state.shield).toBe(0);
      expect(state.poison).toBe(0);
      expect(state.regen).toBe(0);
      expect(state.cooldownMultiplier).toBe(1);
    });

    it("clamps a starting life above max life", () => {
      const state = createSandboxState({ life: 900, maxLife: 500 });
      expect(state.life).toBe(500);
    });

    it("carries authored shield and poison", () => {
      const state = crystal({ shield: 60, poison: 20 });
      expect(state.shield).toBe(60);
      expect(state.poison).toBe(20);
    });
  });

  describe("damage", () => {
    it("goes straight to life when there is no shield", () => {
      const outcome = castInSandbox(crystal(), ability({ power: 50 }));
      expect(outcome.state.life).toBe(450);
      expect(outcome.fx).toEqual({ _tag: "some", value: "damage" });
      expect(outcome.pops).toEqual([
        { text: "-50", kind: "damage", delayMs: 0 },
      ]);
    });

    it("is fully absorbed by a shield at least as large as the hit", () => {
      const outcome = castInSandbox(
        crystal({ shield: 60 }),
        ability({ power: 50 }),
      );
      expect(outcome.state.shield).toBe(10);
      expect(outcome.state.life).toBe(500);
      expect(outcome.pops).toEqual([
        { text: "-50", kind: "shield", delayMs: 0 },
      ]);
    });

    it("splits across shield and life, showing both numbers in order", () => {
      const outcome = castInSandbox(
        crystal({ shield: 20 }),
        ability({ power: 50 }),
      );
      expect(outcome.state.shield).toBe(0);
      expect(outcome.state.life).toBe(470);
      expect(outcome.pops).toEqual([
        { text: "-20", kind: "shield", delayMs: 0 },
        { text: "-30", kind: "damage", delayMs: 220 },
      ]);
    });

    it("never drops life below zero", () => {
      const outcome = castInSandbox(
        crystal({ life: 30 }),
        ability({ power: 100 }),
      );
      expect(outcome.state.life).toBe(0);
      expect(isSandboxDefeated(outcome.state)).toBe(true);
    });

    it("adds a permanent power bonus to the hit", () => {
      const state = { ...crystal(), powerBonus: 20 };
      const outcome = castInSandbox(state, ability({ power: 50 }));
      expect(outcome.state.life).toBe(430);
    });
  });

  describe("poison", () => {
    it("pierces the shield entirely and builds a status rate", () => {
      const outcome = castInSandbox(
        crystal({ shield: 60 }),
        ability({ kind: "poison", power: 40 }),
      );
      expect(outcome.state.shield).toBe(60); // untouched
      expect(outcome.state.life).toBe(460);
      expect(outcome.state.poison).toBe(40);
      expect(outcome.pops).toEqual([
        { text: "-40", kind: "poison", delayMs: 0 },
      ]);
      expect(outcome.tickRate).toEqual({
        _tag: "some",
        value: { kind: "poison", amount: 40, intervalMs: 1000 },
      });
    });

    it("honours an authored tick interval", () => {
      const outcome = castInSandbox(
        crystal(),
        ability({ kind: "poison", power: 40, intervalMs: 1200 }),
      );
      expect(outcome.tickRate).toEqual({
        _tag: "some",
        value: { kind: "poison", amount: 40, intervalMs: 1200 },
      });
    });
  });

  describe("shield", () => {
    it("stacks onto an existing shield", () => {
      const outcome = castInSandbox(
        crystal({ shield: 10 }),
        ability({ kind: "shield", power: 50 }),
      );
      expect(outcome.state.shield).toBe(60);
      expect(outcome.state.life).toBe(500);
      expect(outcome.pops).toEqual([
        { text: "+50", kind: "shield", delayMs: 0 },
      ]);
    });
  });

  describe("heal", () => {
    it("restores life", () => {
      const outcome = castInSandbox(
        crystal({ life: 400 }),
        ability({ kind: "heal", power: 40 }),
      );
      expect(outcome.state.life).toBe(440);
      expect(outcome.pops).toEqual([{ text: "+40", kind: "heal", delayMs: 0 }]);
    });

    it("caps at max life and flags the over-heal", () => {
      const outcome = castInSandbox(
        crystal({ life: 480 }),
        ability({ kind: "heal", power: 40 }),
      );
      expect(outcome.state.life).toBe(500);
      expect(outcome.pops).toEqual([
        { text: "+20", kind: "heal", delayMs: 0 },
        { text: "MAX", kind: "heal", delayMs: 420 },
      ]);
    });

    it("removes 1 poison per 20 heal (the rule the slide text quotes)", () => {
      const outcome = castInSandbox(
        crystal({ life: 400, poison: 20 }),
        ability({ kind: "heal", power: 40 }),
      );
      expect(outcome.state.poison).toBe(18);
      expect(outcome.pops).toEqual([
        { text: "+40", kind: "heal", delayMs: 0 },
        { text: "-2☠", kind: "poison", delayMs: 260 },
      ]);
    });

    it("removes no poison from a heal smaller than 20", () => {
      const outcome = castInSandbox(
        crystal({ life: 400, poison: 5 }),
        ability({ kind: "heal", power: 10 }),
      );
      expect(outcome.state.poison).toBe(5);
      expect(outcome.pops).toEqual([{ text: "+10", kind: "heal", delayMs: 0 }]);
    });

    it("never removes more poison than is present", () => {
      const outcome = castInSandbox(
        crystal({ poison: 1 }),
        ability({ kind: "heal", power: 200 }),
      );
      expect(outcome.state.poison).toBe(0);
    });
  });

  describe("regen", () => {
    it("builds a heal rate without an instant heal", () => {
      const outcome = castInSandbox(
        crystal({ life: 400 }),
        ability({ kind: "regen", power: 25, intervalMs: 1200 }),
      );
      expect(outcome.state.regen).toBe(25);
      expect(outcome.state.life).toBe(400);
      expect(outcome.pops).toEqual([]);
      expect(outcome.tickRate).toEqual({
        _tag: "some",
        value: { kind: "regen", amount: 25, intervalMs: 1200 },
      });
    });
  });

  describe("tempo and scaling abilities", () => {
    it("haste halves the cooldown multiplier", () => {
      const outcome = castInSandbox(
        crystal(),
        ability({ kind: "haste", power: 0 }),
      );
      expect(outcome.state.cooldownMultiplier).toBe(0.5);
      expect(outcome.fx).toEqual({ _tag: "none" });
    });

    it("slow doubles it", () => {
      const outcome = castInSandbox(
        crystal(),
        ability({ kind: "slow", power: 0 }),
      );
      expect(outcome.state.cooldownMultiplier).toBe(2);
    });

    it("increase_power accumulates a damage bonus", () => {
      const first = castInSandbox(
        crystal(),
        ability({ kind: "increase_power", power: 20 }),
      );
      const second = castInSandbox(
        first.state,
        ability({ kind: "increase_power", power: 20 }),
      );
      expect(second.state.powerBonus).toBe(40);
      expect(
        castInSandbox(second.state, ability({ power: 50 })).state.life,
      ).toBe(410);
    });

    it("increase_critical accumulates crit chance and caps at 100%", () => {
      const first = castInSandbox(
        crystal(),
        ability({ kind: "increase_critical", power: 25 }),
      );
      expect(first.state.critChance).toBeCloseTo(0.25);
      const second = castInSandbox(
        first.state,
        ability({ kind: "increase_critical", power: 200 }),
      );
      expect(second.state.critChance).toBe(1);
    });

    it("charge leaves the state untouched", () => {
      const state = crystal({ shield: 15 });
      expect(
        castInSandbox(state, ability({ kind: "charge", power: 0 })).state,
      ).toEqual(state);
    });
  });

  describe("tickStatus", () => {
    it("poison ticks damage through an intact shield", () => {
      const { state, pop } = tickStatus(
        crystal({ shield: 100, poison: 40 }),
        "poison",
        40,
      );
      expect(state.life).toBe(460);
      expect(state.shield).toBe(100);
      expect(pop).toEqual({ text: "-40", kind: "poison", delayMs: 0 });
    });

    it("regen ticks heal and cap at max life", () => {
      const { state, pop } = tickStatus(crystal({ life: 480 }), "regen", 25);
      expect(state.life).toBe(500);
      expect(pop).toEqual({ text: "+20", kind: "heal", delayMs: 0 });
    });

    it("a defeated crystal takes no further poison damage", () => {
      const { state } = tickStatus(crystal({ life: 10 }), "poison", 40);
      expect(state.life).toBe(0);
      expect(isSandboxDefeated(state)).toBe(true);
    });
  });

  describe("findSandboxAbility", () => {
    const palette: SandboxAbility[] = [
      ability({ id: "damage" }),
      ability({ id: "heal", kind: "heal" }),
    ];

    it("finds an ability by id", () => {
      const found = findSandboxAbility(palette, "heal");
      expect(isSome(found)).toBe(true);
      if (isSome(found)) expect(found.value.kind).toBe("heal");
    });

    it("returns none for an unknown id", () => {
      expect(isNone(findSandboxAbility(palette, "nope"))).toBe(true);
    });
  });

  describe("previewAbsorption", () => {
    it("splits an incoming hit into absorbed and life-lost parts", () => {
      expect(
        previewAbsorption(crystal({ shield: 20 }) as SandboxState, 50),
      ).toEqual({
        absorbed: 20,
        lifeLost: 30,
      });
    });

    it("reports the whole hit as life loss when there is no shield", () => {
      expect(previewAbsorption(crystal(), 50)).toEqual({
        absorbed: 0,
        lifeLost: 50,
      });
    });
  });
});
