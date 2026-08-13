// Gold (rank 3) recruitable units — powerful build-around units (some locked).
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
  increasePower,
  decreasePower,
  increaseCritical,
  multiplyPower,
  distributePower,
  absorbPower,
  reaction,
  column,
  row,
  randomEnemy,
  self,
  right,
  weakestAlly,
  strongestEnemy,
  strongestAlly,
  weakestEnemy,
  allAllies,
  allAlliesOfType,
} from "../effectBuilders";

export const GOLD_CARDS: Models.CardDefinition[] = [
  {
    id: "toxicologist",
    pic: "neutral_gnasher",
    power: 80,
    rank: 3,
    cooldown: 7800,
    effects: [poison, slow(2000, randomEnemy(2))],
    reactions: [reaction("poison", "allies", increasePower(6, self))],
  },
  {
    id: "expedition_leader",
    pic: "neutral_goldenhammer",
    power: 70,
    rank: 3,
    cooldown: 8400,
    effects: [shield, increasePower(20, column)],
    reactions: [reaction("heal", "allies", increasePower(4, column))],
  },
  {
    id: "vanguard",
    pic: "neutral_gauntletmaster",
    power: 80,
    rank: 3,
    cooldown: 5160,
    effects: [damage, haste(2000, column)],
    reactions: [reaction("haste", "allies", increasePower(2, self, true))],
  },
  {
    id: "veteran_paladin",
    pic: "neutral_goldenjusticar",
    power: 70,
    rank: 3,
    cooldown: 6240,
    effects: [regen, haste(2000, row)],
    reactions: [
      reaction("shield", "column_allies", increasePower(2, self, true)),
    ],
  },
  {
    id: "webert_the_old",
    pic: "neutral_goldenmantella",
    power: 48,
    rank: 3,
    cooldown: 8880,
    effects: [heal, increasePower(20, row)],
    reactions: [
      reaction("regen", "column_allies", increasePower(5, row, true)),
    ],
  },
  {
    // power distributor
    id: "walking_reactor",
    pic: "boss_protector",
    power: 62,
    rank: 3,
    locked: true,
    cooldown: 5000,
    effects: [shield, distributePower(row)],
    reactions: [reaction("all", "column_allies", increasePower(20, self))],
  },
  // power absorber
  {
    id: "spectral_knight",
    pic: "boss_gol",
    power: 18,
    rank: 3,
    locked: true,
    cooldown: 5600,
    effects: [damage, absorbPower(column)],
    reactions: [reaction("all", "row_allies", increasePower(20, column))],
  },
  // re-haste
  {
    id: "windlash_serpent",
    pic: "boss_serpenti",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [shield, haste(2000, row)],
    reactions: [reaction("re_hasted", "allies", increasePower(5, self))],
  },
  // re-slow
  {
    id: "corruption_bringer",
    pic: "boss_legion",
    power: 60,
    rank: 3,
    locked: true,
    cooldown: 5000,
    effects: [poison, slow(2000, randomEnemy(2))],
    reactions: [
      reaction("re_slow", "allies", decreasePower(10, strongestEnemy)),
    ],
  },
  //on_crit
  {
    id: "frontline_dasher",
    pic: "boss_kane",
    power: 58,
    rank: 3,
    locked: true,
    cooldown: 5700,
    effects: [damage, increaseCritical(10, column)],
    reactions: [reaction("on_crit", "allies", increasePower(20, column))],
  },
  //over_heal
  {
    id: "life_balancekeeper",
    pic: "f3_anubis",
    life: 1500,
    power: 60,
    rank: 3,
    locked: true,
    cooldown: 4500,
    effects: [heal],
    reactions: [
      reaction("on_over_heal", "allies", increasePower(1, allAllies, true)),
    ],
  },
  //Balancer
  {
    id: "destiny_balancer",
    pic: "f3_allomancer",
    life: 1500,
    power: 10,
    rank: 3,
    locked: true,
    cooldown: 8600,
    effects: [
      shield,
      decreasePower(100, strongestAlly),
      multiplyPower(1.5, weakestAlly),
    ],
    reactions: [],
  },
  //damage -> poison
  {
    id: "essence_harvester",
    pic: "boss_malyk",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [poison],
    reactions: [
      reaction(
        "every_100_damage",
        "allies",
        increasePower(5, allAlliesOfType("poison")),
      ),
    ],
  },
  //poison -> damage
  {
    id: "plague_incubator",
    pic: "boss_manaman",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [poison],
    reactions: [
      reaction(
        "every_10_poison",
        "allies",
        increasePower(5, allAlliesOfType("damage")),
      ),
    ],
  },
  //shield -> damage
  {
    id: "tempest_ravager",
    pic: "boss_invader",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [regen],
    reactions: [
      reaction(
        "every_100_shield",
        "allies",
        increasePower(5, allAlliesOfType("damage")),
      ),
    ],
  },
  //shield -> heal
  {
    id: "paragon",
    pic: "boss_paragon",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [regen],
    reactions: [
      reaction(
        "every_100_shield",
        "allies",
        increasePower(5, allAlliesOfType("heal")),
      ),
    ],
  },
  //heal -> regen
  {
    id: "vitality_channeler",
    pic: "f2_sepukku",
    power: 65,
    rank: 3,
    locked: true,
    cooldown: 4300,
    effects: [heal],
    reactions: [
      reaction(
        "every_100_heal",
        "allies",
        increasePower(5, allAlliesOfType("regen")),
      ),
    ],
  },
  //heal -> heal
  {
    id: "mend_sage",
    pic: "boss_orias",
    power: 40,
    rank: 3,
    locked: true,
    cooldown: 5200,
    effects: [heal, increasePower(5, allAlliesOfType("heal"))],
    reactions: [
      reaction(
        "on_battle_start",
        "allies",
        haste(2000, allAlliesOfType("heal")),
      ),
    ],
  },
  //damage -> damage
  {
    id: "warbringer",
    pic: "boss_solfist",
    power: 60,
    rank: 3,
    locked: true,
    cooldown: 6200,
    effects: [damage, increasePower(10, allAlliesOfType("damage"))],
    reactions: [
      reaction(
        "on_battle_start",
        "allies",
        haste(2000, allAlliesOfType("damage")),
      ),
    ],
  },
  //shield -> shield
  {
    id: "aegis_archon",
    pic: "f3_tier2general",
    power: 35,
    rank: 3,
    locked: true,
    cooldown: 6200,
    effects: [shield],
    reactions: [
      reaction(
        "damage",
        "enemies",
        increasePower(5, allAlliesOfType("shield")),
        "enemy",
      ),
    ],
  },
  //poison -> poison
  {
    id: "plague_sovereign",
    pic: "f4_abomination",
    power: 40,
    rank: 3,
    locked: true,
    cooldown: 5200,
    effects: [poison],
    reactions: [
      reaction("on_battle_start", "allies", slow(2000, randomEnemy(4))),
      reaction(
        "re_slow",
        "allies",
        increasePower(5, allAlliesOfType("poison")),
      ),
    ],
  },
  //regen -> regen
  {
    id: "life_weaver",
    pic: "f3_insightcaster",
    power: 60,
    rank: 3,
    locked: true,
    cooldown: 4200,
    effects: [regen],
    reactions: [
      reaction("every_10_regen", "allies", increasePower(20, weakestAlly)),
    ],
  },
  //gambler2
  {
    id: "fate_shifter",
    pic: "boss_sandpanther",
    power: 10,
    rank: 3,
    locked: true,
    cooldown: 9200,
    effects: [
      damage,
      multiplyPower(1.5, right),
      multiplyPower(1.5, weakestEnemy),
    ],
    reactions: [],
  },
];
