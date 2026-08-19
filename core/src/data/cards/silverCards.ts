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
  increaseCritical,
  decreasePower,
  distributePower,
  absorbPower,
  reaction,
  column,
  row,
  randomEnemy,
  trigger,
  self,
  left,
  right,
  weakestAlly,
  strongestEnemy,
  allAllies,
  allAlliesOfType,
} from "../effectBuilders";

export const SILVER_CARDS: Models.CardDefinition[] = [
  {
    id: "mana_source",
    description:
      "Row-haste support that self-charges off left ally regen — haste/regen hybrid engine.",
    tags: ["haster", "charger"],
    pic: "f4_furosa",
    power: 65,
    cooldown: 6400,
    rank: 2,
    effects: [regen, haste(1000, row)],
    reactions: [reaction("regen", "left_ally", charge(200, self))],
  },
  {
    id: "grove_guardian",
    description:
      "Charges its row and empowers its right ally off enemy damage — counter-support engine.",
    tags: ["charger", "cross_force", "team_buff"],
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
    description:
      "Charges its left ally and permanently self-ramps off column haste — haste charge engine.",
    tags: ["charger", "grow_over_time"],
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
    description:
      "Column-haste conduit that permanently empowers its column off row haste — double haste engine.",
    tags: ["haster", "team_buff", "grow_over_time"],
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
    description:
      "Charges its column and permanently ramps the triggerer off row regen — regen engine.",
    tags: ["charger", "grow_over_time"],
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
    description:
      "Poison + double-slow disabler that self-ramps off enemy damage — control snowball.",
    tags: ["disabler", "cross_force", "grow_over_time"],
    pic: "neutral_geargrinder",
    power: 50,
    rank: 2,
    cooldown: 7000,
    effects: [poison, slow(2000, randomEnemy(2))],
    reactions: [reaction("damage", "enemies", increasePower(5, self), "enemy")],
  },
  {
    id: "coral_builder",
    description:
      "Column-haste support that self-ramps off allied shields — shield/haste engine.",
    tags: ["haster", "grow_over_time"],
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
    description:
      "Metronome healer — hastes the opposite side of whichever side ally acts; tempo engine.",
    tags: ["haster", "type_engine"],
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
  // power distributor
  {
    id: "walking_reactor",
    description:
      "Power distributor — spreads row power and self-ramps off column shields.",
    tags: ["power_redistribution", "team_buff"],
    pic: "boss_protector",
    power: 62,
    rank: 2,
    locked: true,
    cooldown: 6000,
    effects: [shield, distributePower(row)],
    reactions: [reaction("shield", "column_allies", increasePower(8, self))],
  },
  // power absorber
  {
    id: "spectral_knight",
    description:
      "Power absorber — siphons column power and empowers its column off row damage.",
    tags: ["power_redistribution", "team_buff"],
    pic: "boss_gol",
    power: 18,
    rank: 2,
    locked: true,
    cooldown: 7000,
    effects: [damage, absorbPower(column)],
    reactions: [reaction("damage", "row_allies", increasePower(3, column))],
  },
  // re-haste
  {
    id: "windlash_serpent",
    description:
      "Re-haste engine — shields and hastes its row, self-ramping off every re-haste.",
    tags: ["haster", "grow_over_time"],
    pic: "boss_serpenti",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 4300,
    effects: [shield, haste(2000, row)],
    reactions: [reaction("re_hasted", "allies", increasePower(5, self))],
  },
  // re-slow
  {
    id: "corruption_bringer",
    description:
      "Re-slow engine — poisons and slows, draining the strongest enemy on every re-slow.",
    tags: ["disabler", "type_engine"],
    pic: "boss_legion",
    power: 60,
    rank: 2,
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
    description:
      "Crit engine — grants column crit and empowers the column off every allied crit.",
    tags: ["crit_battery", "team_buff"],
    pic: "boss_kane",
    power: 58,
    rank: 2,
    locked: true,
    cooldown: 5700,
    effects: [damage, increaseCritical(10, column)],
    reactions: [reaction("on_crit", "allies", increasePower(12, column))],
  },
  //over_heal
  {
    id: "life_balancekeeper",
    description:
      "Over-heal engine — permanently empowers the whole team whenever anyone over-heals.",
    tags: ["type_engine", "team_buff", "grow_over_time"],
    pic: "f3_anubis",
    life: 1500,
    power: 60,
    rank: 2,
    locked: true,
    cooldown: 4500,
    effects: [heal],
    reactions: [
      reaction("on_over_heal", "allies", increasePower(1, allAllies, true)),
    ],
  },
  //damage -> poison
  {
    id: "essence_harvester",
    description:
      "Damage→poison engine — empowers poison allies off allied damage thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "boss_malyk",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 6000,
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
    description:
      "Poison→damage engine — empowers damage allies off poison thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "boss_manaman",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 6000,
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
    description:
      "Shield→damage engine — empowers damage allies off shield thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "boss_invader",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 6000,
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
    description:
      "Shield→heal engine — empowers heal allies off shield thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "boss_paragon",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 6000,
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
    description:
      "Heal→regen engine — empowers regen allies off heal thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "f2_sepukku",
    power: 65,
    rank: 2,
    locked: true,
    cooldown: 6000,
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
    description:
      "Heal archetype engine — permanently empowers heal allies and opens with team haste.",
    tags: ["type_engine", "team_buff", "haster"],
    pic: "boss_orias",
    power: 40,
    rank: 2,
    locked: true,
    cooldown: 5200,
    effects: [heal, increasePower(5, allAlliesOfType("heal"))],
    reactions: [
      reaction(
        "on_battle_start",
        "allies",
        haste(1500, allAlliesOfType("heal")),
      ),
    ],
  },
  //regen -> regen
  {
    id: "life_weaver",
    description:
      "Regen engine — empowers the weakest ally off regen thresholds.",
    tags: ["type_engine", "team_buff"],
    pic: "f3_insightcaster",
    power: 60,
    rank: 2,
    locked: true,
    cooldown: 4200,
    effects: [regen],
    reactions: [
      reaction("every_10_regen", "allies", increasePower(10, weakestAlly)),
    ],
  },
  {
    id: "vulture",
    description: "Feeds on weakness — grows power when enemies are slowed.",
    tags: ["cross_force", "grow_over_time"],
    pic: "neutral_bonereaper",
    power: 75,
    rank: 2,
    cooldown: 6000,
    effects: [poison],
    reactions: [reaction("slow", "enemies", increasePower(6, self), "enemy")],
  },
];
