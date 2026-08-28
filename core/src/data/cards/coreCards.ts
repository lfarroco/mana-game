// Core crystals — every run starts with one of these anchor units.
// Split from data/BaseCollection.ts (tier grouping) — balance conventions in
// docs/unit-balance.md, tier design in docs/card-design-philosophy.md.
//
// Cores are SIMPLE KITS (2026-08-28 basic-crystal balance pass): each ships
// exactly two effects — one basic action (damage/heal/shield/poison/regen, the
// absolute basic-effect rule) plus one simple, direct action (haste / slow /
// increase_power / decrease_power / a second basic) that fits the crystal's
// theme — and no reactions. Crystals must stay simple for new players, so their
// depth (the former secondary buffs and reactions) lives in the themed
// upgrade-orb catalog — see docs/core-unit-onboarding.md §3–§4 (CUB-A3).
//
// All 9 cores are normalized to ~100 AP per 5s (see
// content/coreUpgrades.balance.test.ts) so no starting kit is a strict
// duplicate of another.

import * as Models from "../../Models";
import {
  regen,
  damage,
  heal,
  shield,
  poison,
  haste,
  slow,
  increasePower,
  decreasePower,
  column,
  row,
  self,
  randomEnemy,
  strongestEnemy,
} from "../effectBuilders";

export const CORE_CARDS: Models.CardDefinition[] = [
  {
    id: "mana_crystal",
    pic: "blue-stone",
    life: 500,
    power: 35,
    cooldown: 5200,
    isCore: true,
    coreTheme: "regen",
    // Mana flows through the column: sustain (regen) + a column power buff.
    // The identity orb `mana_column_growth` upgrades the column buff to +10.
    effects: [regen, increasePower(5, column)],
    reactions: [],
  },
  {
    id: "critical_crystal",
    pic: "red-stone",
    life: 500,
    power: 42,
    cooldown: 5000,
    isCore: true,
    coreTheme: "damage",
    // Crits stagger the biggest threat: raw damage + slow on the strongest enemy.
    effects: [damage, slow(1000, strongestEnemy)],
    reactions: [],
  },
  {
    id: "protective_crystal",
    pic: "rocky-stone",
    life: 600,
    power: 35,
    cooldown: 4500,
    isCore: true,
    coreTheme: "shield",
    // Shields the core and empowers the row it guards.
    effects: [shield, increasePower(5, row)],
    reactions: [],
  },
  {
    id: "growth_crystal",
    pic: "green-stone",
    life: 500,
    power: 36,
    cooldown: 4500,
    isCore: true,
    coreTheme: "heal",
    // Growth: heals the core and the crystal itself gains power every cast.
    // The identity orb `heal_vitality` upgrades the self buff to +5 permanent.
    effects: [heal, increasePower(4, self)],
    reactions: [],
  },
  {
    id: "purple_crystal",
    pic: "purple-stone",
    life: 500,
    power: 40,
    cooldown: 4700,
    isCore: true,
    coreTheme: "poison",
    // Venom slows: poison the enemy core and slow a random enemy.
    // (The former identity orb `poison_slow_enemy` became this baseline; the
    // poison pool now offers `poison_re_slow_haste` instead.)
    effects: [poison, slow(1000, randomEnemy(1))],
    reactions: [],
  },
  {
    id: "quickstone",
    // Haste theme paired with regen — the absolute basic-effect rule requires
    // every unit (cores included) to carry ≥ 1 damage/heal/shield/poison/regen
    // effect, and regen is quickstone's historical "refresh" partner (see
    // docs/core-unit-onboarding.md §2, decision 4).
    //
    // Stat-normalized in the 2026-08-28 balance pass: power 20 → 37, cooldown
    // 5200 → 5000 so its regen + row-haste kit prices to ~100 AP like the other
    // cores.
    pic: "haste-stone",
    life: 500,
    power: 37,
    cooldown: 5000,
    isCore: true,
    coreTheme: "haste",
    effects: [regen, haste(1000, row)],
    reactions: [],
  },
  {
    id: "radiant_crystal",
    // Overflow theme (CUB-G1, docs/core-unit-onboarding.md §9): a heal-family
    // crystal that converts overhealing into offense. Stat line trades growth's
    // fast 4500ms cadence for a heavier heal (power 43) on a slower 5000ms one —
    // its identity is "big heals that spill over", not "constant trickle". The
    // baseline self-haste makes the crystal pulse faster, feeding its
    // on_over_heal identity orbs.
    pic: "yellow-stone",
    life: 500,
    power: 43,
    cooldown: 5000,
    isCore: true,
    coreTheme: "overflow",
    effects: [heal, haste(1000, self)],
    reactions: [],
  },
  {
    id: "verdant_crystal",
    // Thorns theme (CUB-G2, docs/core-unit-onboarding.md §9): a shield-family
    // crystal that retaliates when it takes a hit. The tankiest crystal — the
    // only one with 550 life — because its identity is "punish whoever dares
    // to hit you": every thorns-family identity orb reacts on_crystal_hit.
    // Its simple baseline is shield + damage — the closest a no-reaction kit
    // gets to "strikes back" (a second basic action; see the 2026-08-28
    // basic-crystal balance pass).
    pic: "healing-stone",
    life: 550,
    power: 28,
    cooldown: 5000,
    isCore: true,
    coreTheme: "thorns",
    effects: [shield, damage],
    reactions: [],
  },
  {
    id: "void_crystal",
    // Void theme (CUB-G3, docs/core-unit-onboarding.md §9): a disruption
    // crystal that saps the strongest enemy's power on every cast and steals
    // their statuses via its identity orbs. Its baseline pairs a basic hit
    // (damage — every unit needs ≥ 1 basic effect) with the power sap.
    // Stat-normalized in the 2026-08-28 balance pass: power 20 → 30 so the
    // 2-effect kit prices to ~100 AP like the other cores.
    pic: "void-stone",
    life: 500,
    power: 30,
    cooldown: 5000,
    isCore: true,
    coreTheme: "void",
    effects: [damage, decreasePower(10, strongestEnemy)],
    reactions: [],
  },
];
