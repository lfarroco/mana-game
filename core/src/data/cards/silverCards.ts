// Silver (rank 2) recruitable units — situational synergy units.
// Split from data/BaseCollection.ts (tier grouping) — balance conventions in
// docs/unit-balance.md, tier design in docs/card-design-philosophy.md.

import * as Models from "../../Models";
import {
  regen,
  damage,
  heal,
  shield,
  poison,
  haste,
  slow,
  charge,
  increasePower,
  reaction,
  column,
  row,
  randomEnemy,
  trigger,
  self,
  left,
  right,
} from "../effectBuilders";

export const SILVER_CARDS: Models.CardDefinition[] = [
  {
    id: "mana_source",
    pic: "f4_furosa",
    power: 65,
    cooldown: 6400,
    rank: 2,
    effects: [regen, haste(1000, row)],
    reactions: [reaction("regen", "left_ally", charge(200, self))],
  },
  {
    id: "grove_guardian",
    pic: "neutral_keeperofthevale",
    power: 45,
    cooldown: 4800,
    rank: 2,
    effects: [regen, charge(200, row)],
    reactions: [
      reaction("damage", "enemies", increasePower(4, right), "enemy"),
    ],
  },
  {
    id: "thunder_core",
    pic: "neutral_emp",
    power: 75,
    rank: 2,
    cooldown: 5800,
    effects: [damage, charge(300, left)],
    reactions: [
      reaction("haste", "column_allies", increasePower(6, self, true)),
    ],
  },
  {
    id: "conduit_howler",
    pic: "neutral_exun",
    power: 45,
    rank: 2,
    cooldown: 4800,
    effects: [shield, haste(2000, column)],
    reactions: [
      reaction("haste", "row_allies", increasePower(4, column, true)),
    ],
  },
  {
    id: "water_elemental",
    pic: "neutral_fog",
    power: 45,
    rank: 2,
    cooldown: 5800,
    effects: [heal, charge(300, column)],
    reactions: [
      reaction("regen", "row_allies", increasePower(6, trigger, true)),
    ],
  },
  {
    id: "master_of_thorns",
    pic: "neutral_geargrinder",
    power: 50,
    rank: 2,
    cooldown: 7000,
    effects: [poison, slow(2000, randomEnemy(2))],
    reactions: [reaction("damage", "enemies", increasePower(5, self), "enemy")],
  },
  {
    id: "coral_builder",
    pic: "neutral_giantcrab",
    power: 48,
    rank: 2,
    cooldown: 5800,
    effects: [regen, haste(2000, column)],
    reactions: [reaction("shield", "allies", increasePower(5, self))],
  },
  //metronome
  {
    id: "cadence_warden",
    pic: "f6_3rdgeneral",
    life: 1500,
    power: 70,
    rank: 2,
    locked: true,
    cooldown: 5500,
    effects: [heal],
    reactions: [
      reaction("all", "left_ally", haste(2000, right)),
      reaction("all", "right_ally", haste(2000, left)),
    ],
  },
];
