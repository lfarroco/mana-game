export type Job = {
  id: string;
  name: string;
  description: string;
  moveRange: number;
  upgrades: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    accuracy: number;
    agility: number;
  };
  baseAttack: string;
  skills: string[];
};

export const jobs: Job[] = [
  {
    id: "archer",
    name: "Archer",
    description: `Ranged DPS | Pick off enemies from a distance with high accuracy.
Focus: Backline damage, kiting.`,
    moveRange: 3,
    stats: {
      hp: 100,
      attack: 50,
      defense: 0,
      accuracy: 10,
      agility: 16,
    },
    baseAttack: "shoot",
    skills: ["multishot", "shoot"],
    upgrades: [
      "hunter",
      "sniper"
    ]
  },
  {
    id: "acolyte",
    name: "Acolyte",
    description: `Healing Support | Restore health to allies with your attacks.
Focus: Sustain, hybrid damage/support.`,
    moveRange: 2,
    stats: {
      hp: 80,
      attack: 30,
      defense: 2,
      accuracy: 0,
      agility: 12,
    },
    baseAttack: "heal",
    skills: ["heal"],
    upgrades: [
      "cleric",
      "monk"
    ]
  },
  {
    id: "apprentice",
    name: "Apprentice",
    description: `AoE Mage | Unleash devastating firestorms that burn enemies over time.
Focus: AoE damage, crowd control.`,
    moveRange: 2,
    stats: {
      hp: 80,
      attack: 30,
      defense: 0,
      accuracy: 0,
      agility: 4,
    },
    baseAttack: "fireball",
    upgrades: [
      "elementalist",
      "arcanist"
    ],
    skills: ["fireball"],
  },
  {
    id: "soldier",
    name: "Soldier",
    description: `Melee Tank | Absorb damage and protect allies with high defense.
Focus: Frontline tanking, crowd control.`,
    moveRange: 3,
    stats: {
      hp: 250,
      attack: 10,
      defense: 20,
      accuracy: 10,
      agility: 8,
    },
    baseAttack: "slash",
    upgrades: [
      "knight",
      "berserker"
    ]
    , skills: ["shieldbash", "slash"],
  },
  {
    id: "thief",
    name: "Thief",
    description: `A slippery opportunist who thrives on evasion and punishing enemy mistakes.`,
    moveRange: 4,
    stats: {
      hp: 200,
      attack: 30,
      defense: 0,
      accuracy: 0,
      agility: 4,
    },
    baseAttack: "slash",
    upgrades: [
      "ninja",
      "rogue"
    ]
    , skills: ["slash"],
  },
  {
    id: "blob",
    name: "Green Blob",
    description: `Blob | Blob.`,
    moveRange: 1,
    stats: {
      hp: 30,
      attack: 20,
      defense: 10,
      accuracy: 10,
      agility: 10,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["slash"],
  },
  {
    id: "blob_king",
    name: "Blob King",
    description: `Blob King | Blob King.`,
    moveRange: 1,
    stats: {
      hp: 500,
      attack: 30,
      defense: 20,
      accuracy: 10,
      agility: 10,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["summon_blob", "slash"],
  },
  {
    id: "elementalist",
    name: "Elementalist",
    description: `AoE damage, crowd control
Unleash devastating firestorms
that burn enemies over time.  `,
    moveRange: 2,
    stats: {
      hp: 12,
      attack: 4,
      defense: 1,
      accuracy: 0,
      agility: 10,
    },
    baseAttack: "fireball",
    upgrades: []
    , skills: ["fireball"],
  },
  {
    id: "arcanist",
    name: "Arcanist",
    description: `Defensive support, pre-combat prep
Bolster allies with arcane barriers
at the start of battle. `,
    moveRange: 2,
    stats: {
      hp: 10,
      attack: 2,
      defense: 0,
      accuracy: 0,
      agility: 14,
    },
    baseAttack: "fireball",
    upgrades: []
    , skills: ["fireball"],
  },
  {
    id: "knight",
    name: "Knight",
    description: `Defensive Tank | Force enemies to target you while protecting allies.
Focus: Taunt, damage mitigation.`,
    moveRange: 2,
    stats: {
      hp: 350,
      attack: 30,
      defense: 4,
      accuracy: 0,
      agility: 6,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["slash"],
  },
  {
    id: "berserker",
    name: "Berserker",
    description: `Rage-fueled DPS | Trade defense for relentless, self-sustaining offense.
Focus: High-risk damage, lifesteal.`,
    moveRange: 3,
    stats: {
      hp: 300,
      attack: 50,
      defense: 0,
      accuracy: 0,
      agility: 10,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["slash"],
  },
  {
    id: "sniper",
    name: "Sniper",
    description: `Execution Specialist | Eliminate weakened foes with guaranteed critical strikes.
Focus: Priority target removal, backline damage.`,
    moveRange: 3,
    stats: {
      hp: 12,
      attack: 7,
      defense: 0,
      accuracy: 0,
      agility: 18,
    },
    baseAttack: "shoot",
    upgrades: []
    , skills: ["shoot"],
  },
  {
    id: "hunter",
    name: "Hunter",
    description: `Crowd Control Trapper | Lock down enemies with roots after each kill.
Focus: Area denial, disruption.`,
    moveRange: 3,
    stats: {
      hp: 14,
      attack: 6,
      defense: 1,
      accuracy: 0,
      agility: 14,
    },
    baseAttack: "shoot",
    upgrades: []
    , skills: ["shoot"],
  },
  {
    id: "cleric",
    name: "Cleric",
    description: `Combat Healer | Convert your attacks into healing for the most injured ally.
Focus: Sustain, hybrid damage/support.`,
    moveRange: 2,
    stats: {
      hp: 14,
      attack: 3,
      defense: 1,
      accuracy: 0,
      agility: 12,
    },
    baseAttack: "heal",
    upgrades: []
    , skills: ["heal"],
  },
  {
    id: "monk",
    name: "Monk",
    description: `Evasive Support | Dodge attacks and heal yourself while baiting enemy focus.
Focus: Self-sustain, distraction.`,
    moveRange: 2,
    stats: {
      hp: 18,
      attack: 4,
      defense: 1,
      accuracy: 0,
      agility: 10,
    },
    baseAttack: "heal",
    upgrades: []
    , skills: ["heal"],
  },
  {
    id: "rogue",
    name: "Rogue",
    description: `Assassin | Stealth and critical strikes to eliminate high-priority targets.
Focus: Priority target removal, evasion.`,
    moveRange: 3,
    stats: {
      hp: 16,
      attack: 7,
      defense: 0,
      accuracy: 0,
      agility: 16,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["rogue"],
  },
  {
    id: "ninja",
    name: "Ninja",
    description: `Stealthy Assassin | Slip past enemy lines and strike from the shadows.
Focus: Priority target removal, evasion.`,
    moveRange: 3,
    stats: {
      hp: 14,
      attack: 6,
      defense: 0,
      accuracy: 0,
      agility: 22,
    },
    baseAttack: "slash",
    upgrades: []
    , skills: ["ninja"],
  }
];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

