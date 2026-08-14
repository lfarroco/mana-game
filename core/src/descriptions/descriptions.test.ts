/// <reference types="jest" />

import {
  buildCompactEffectBlock,
  buildEffectBlock,
  getReactionDescription,
  type Translate,
} from "./descriptions";
import type { Effect, EffectReaction } from "../Models";

const fakeT: Translate = (key, params) => {
  const table: Record<string, string> = {
    "tooltip.sentence.damage": "{amount} damage to {target}",
    "tooltip.sentence.haste": "Haste {duration}s on {target}",
    "tooltip.sentence.increase_power": "+{amount} power to {target}",
    "tooltip.targets.default": "targets",
    "tooltip.effects.damage": "Damage",
    "tooltip.effects.haste": "Haste",
    "tooltip.effects.increase_power": "Power",
    "tooltip.sentence.trigger.default": "{effect} on {source}",
    "tooltip.sentence.reaction": "{trigger} => {effect}",
    "tooltip.sentence.position.any": "any",
    "tooltip.sentence.position.ally": "allies",
    "description.cooldown": "CD",
    "description.crit": "Crit",
    "description.noAbilities": "No abilities",
    "rank.bronze": "Bronze",
    "rank.silver": "Silver",
    "rank.gold": "Gold",
    "rank.platinum": "Platinum",
    "card.test_crystal.name": "Test Crystal",
    "crystalSelection.cooldown": "CD",
    "crystalSelection.life": "Life",
    "crystalSelection.noAbilities": "No abilities",
    "tooltip.sentence.target.all_allies_type": "all {type}",
  };
  let s = table[key] ?? key;
  if (params)
    for (const [k, v] of Object.entries(params))
      s = s.replace(new RegExp(`{${k}}`, "g"), String(v));
  return s;
};

describe("descriptions", () => {
  describe("buildEffectBlock", () => {
    it("renders a targetless damage effect as an interpolated sentence (non-compact)", () => {
      const effect = { id: "damage" } as unknown as Effect;
      const result = buildEffectBlock(effect, 5, fakeT, false);
      expect(result).toContain("5 damage to");
    });

    it("renders a damage effect in compact BBCode form", () => {
      const effect = { id: "damage" } as unknown as Effect;
      const result = buildEffectBlock(effect, 5, fakeT, true);
      expect(result).toBe("[color=#f21414ff]Damage 5[/color]");
    });

    it("formats haste duration in seconds (non-compact)", () => {
      const effect = { id: "haste", duration: 1500, targets: { id: "self" } } as unknown as Effect;
      const result = buildEffectBlock(effect, 5, fakeT, false);
      expect(result).toContain("Haste 1.5s");
    });

    it("returns null for trigger-only effects in both modes", () => {
      for (const id of ["on_crit", "on_battle_start"]) {
        const effect = { id } as unknown as Effect;
        expect(buildEffectBlock(effect, 5, fakeT, false)).toBeNull();
        expect(buildEffectBlock(effect, 5, fakeT, true)).toBeNull();
        expect(buildCompactEffectBlock(effect, 5, fakeT)).toBeNull();
      }
    });
  });

  describe("buildCompactEffectBlock", () => {
    it("marks permanent increase_power with an asterisk", () => {
      const effect = { id: "increase_power", amount: 5, permanent: true } as unknown as Effect;
      const result = buildCompactEffectBlock(effect, 5, fakeT);
      expect(result).toContain("+5*");
    });
  });

  describe("getReactionDescription", () => {
    it("renders an on_crit reaction in both modes", () => {
      const reaction = {
        effectId: "on_crit",
        effects: [{ id: "damage" } as Effect],
      } as unknown as EffectReaction;
      const compact = getReactionDescription(reaction, 10, fakeT, true);
      const nonCompact = getReactionDescription(reaction, 10, fakeT, false);
      expect(compact).toContain("tooltip.effects.on_crit");
      expect(nonCompact).toContain("tooltip.sentence.trigger.on_crit");
      expect(compact.length).toBeGreaterThan(0);
      expect(nonCompact.length).toBeGreaterThan(0);
    });

    it("renders a positioned damage reaction with compact and full target text", () => {
      const reaction = {
        effectId: "damage",
        position: "top_ally",
        effects: [{ id: "damage" } as Effect],
      } as unknown as EffectReaction;
      const compact = getReactionDescription(reaction, 10, fakeT, true);
      const nonCompact = getReactionDescription(reaction, 10, fakeT, false);
      expect(compact).toContain("top");
      expect(nonCompact).toContain("tooltip.sentence.position.top");
    });
  });
});
