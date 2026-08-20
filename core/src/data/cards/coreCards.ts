// Core crystals — every run starts with one of these anchor units.
// Split from data/BaseCollection.ts (tier grouping) — balance conventions in
// docs/unit-balance.md, tier design in docs/card-design-philosophy.md.
//
// Cores are ACTION-ONLY BASELINES: each ships one basic action (its
// `coreTheme` family) and no reactions. Their depth (the former secondary buffs
// and reactions) lives in the themed upgrade-orb catalog — see
// docs/core-unit-onboarding.md §3–§4 (CUB-A3).

import * as Models from "../../Models";
import {
  regen,
  damage,
  heal,
  shield,
  poison,
  haste,
  row,
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
    effects: [regen],
    reactions: [],
  },
  {
    id: "critical_crystal",
    pic: "red-stone",
    life: 500,
    power: 35,
    cooldown: 5200,
    isCore: true,
    coreTheme: "damage",
    effects: [damage],
    reactions: [],
  },
  {
    id: "protective_crystal",
    pic: "yellow-stone",
    life: 600,
    power: 35,
    cooldown: 4500,
    isCore: true,
    coreTheme: "shield",
    effects: [shield],
    reactions: [],
  },
  {
    id: "growth_crystal",
    pic: "green-stone",
    life: 500,
    power: 35,
    cooldown: 4500,
    isCore: true,
    coreTheme: "heal",
    effects: [heal],
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
    effects: [poison],
    reactions: [],
  },
  {
    id: "quickstone",
    pic: "haste-stone",
    life: 500,
    power: 48,
    cooldown: 5200,
    isCore: true,
    coreTheme: "haste",
    effects: [haste(1000, row)],
    reactions: [],
  },
  {
    id: "radiant_crystal",
    // Overflow theme (CUB-G1, docs/core-unit-onboarding.md §9): a heal-family
    // crystal that converts overhealing into offense. Stat line trades growth's
    // fast 4500ms cadence for a heavier heal (power 40) on a slower 5000ms one —
    // its identity is "big heals that spill over", not "constant trickle".
    pic: "yellow-stone",
    life: 500,
    power: 40,
    cooldown: 5000,
    isCore: true,
    coreTheme: "overflow",
    effects: [heal],
    reactions: [],
  },
];
