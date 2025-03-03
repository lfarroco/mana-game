export type Job = {
  id: string;
  name: string;
  description: string;
  moveRange: number;
  attackRange: number;
  attackPower: number;
  upgrades: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    accuracy: number;
    agility: number;
  };
  skill: string
};

export const jobs: Job[] = [
  {
    id: "archer",
    name: "Archer",
    description: `Ranged DPS | Pick off enemies from a distance with high accuracy.
Focus: Backline damage, kiting.`,
    moveRange: 3,
    attackRange: 4,
    attackPower: 40,
    stats: {
      hp: 100,
      attack: 50,
      defense: 0,
      accuracy: 10,
      agility: 16,
    },
    skill: "shoot",
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
    attackPower: 15,
    attackRange: 1,
    stats: {
      hp: 80,
      attack: 30,
      defense: 2,
      accuracy: 0,
      agility: 12,
    },
    skill: "heal",
    upgrades: [
      "priest",
      "plaguedoctor"
    ]
  },
  {
    id: "apprentice",
    name: "Apprentice",
    description: `AoE Mage | Unleash devastating firestorms that burn enemies over time.
Focus: AoE damage, crowd control.`,
    moveRange: 2,
    attackPower: 20,
    attackRange: 3,
    stats: {
      hp: 80,
      attack: 30,
      defense: 0,
      accuracy: 0,
      agility: 4,
    },
    skill: "fireball",
    upgrades: [
      "elementalist",
      "arcanist"
    ]
  },
  {
    id: "soldier",
    name: "Soldier",
    description: `Melee Tank | Absorb damage and protect allies with high defense.
Focus: Frontline tanking, crowd control.`,
    moveRange: 3,
    attackRange: 1,
    attackPower: 10,
    stats: {
      hp: 150,
      attack: 40,
      defense: 20,
      accuracy: 10,
      agility: 8,
    },
    skill: "slash",
    upgrades: [
      "knight",
      "berserker"
    ]
  },
  {
    id: "rogue",
    name: "Rogue",
    description: `Stealth DPS | Ambush enemies from behind for critical strikes.
Focus: Priority target removal, evasion.`,
    moveRange: 2,
    attackPower: 20,
    attackRange: 3,
    stats: {
      hp: 200,
      attack: 30,
      defense: 0,
      accuracy: 0,
      agility: 4,
    },
    skill: "slash",
    upgrades: [
      "ninja",
      "swashbuckler"
    ]
  },
  {
    id: "blob",
    name: "Green Blob",
    description: `Blob | Blob.`,
    moveRange: 1,
    attackRange: 1,
    attackPower: 10,
    stats: {
      hp: 60,
      attack: 20,
      defense: 10,
      accuracy: 10,
      agility: 10,
    },
    skill: "slash",
    upgrades: []
  },

  {
    id: "elementalist",
    name: "Elementalist",
    description: `AoE damage, crowd control
Unleash devastating firestorms
that burn enemies over time.  `,
    moveRange: 2,
    attackPower: 4,
    attackRange: 3,
    stats: {
      hp: 12,
      attack: 4,
      defense: 1,
      accuracy: 0,
      agility: 10,
    },
    skill: "fireball",
    upgrades: []
  },
  {
    id: "arcanist",
    name: "Arcanist",
    description: `Defensive support, pre-combat prep
Bolster allies with arcane barriers
at the start of battle. `,
    moveRange: 2,
    attackPower: 2,
    attackRange: 3,
    stats: {
      hp: 10,
      attack: 2,
      defense: 0,
      accuracy: 0,
      agility: 14,
    },
    skill: "fireball",
    upgrades: []
  },
  {
    id: "knight",
    name: "Knight",
    description: `Defensive Tank | Force enemies to target you while protecting allies.
Focus: Taunt, damage mitigation.`,
    moveRange: 2,
    attackPower: 5,
    attackRange: 1,
    stats: {
      hp: 20,
      attack: 5,
      defense: 4,
      accuracy: 0,
      agility: 6,
    },
    skill: "slash",
    upgrades: []
  },
  {
    id: "berserker",
    name: "Berserker",
    description: `Rage-fueled DPS | Trade defense for relentless, self-sustaining offense.
Focus: High-risk damage, lifesteal.`,
    moveRange: 3,
    attackPower: 8,
    attackRange: 1,
    stats: {
      hp: 18,
      attack: 8,
      defense: 0,
      accuracy: 0,
      agility: 10,
    },
    skill: "slash",
    upgrades: []
  },
  {
    id: "sniper",
    name: "Sniper",
    description: `Execution Specialist | Eliminate weakened foes with guaranteed critical strikes.
Focus: Priority target removal, backline damage.`,
    moveRange: 3,
    attackPower: 7,
    attackRange: 4,
    stats: {
      hp: 12,
      attack: 7,
      defense: 0,
      accuracy: 0,
      agility: 18,
    },
    skill: "shoot",
    upgrades: []
  },
  {
    id: "hunter",
    name: "Hunter",
    description: `Crowd Control Trapper | Lock down enemies with roots after each kill.
Focus: Area denial, disruption.`,
    moveRange: 3,
    attackPower: 6,
    attackRange: 4,
    stats: {
      hp: 14,
      attack: 6,
      defense: 1,
      accuracy: 0,
      agility: 14,
    },
    skill: "shoot",
    upgrades: []
  },
  {
    id: "cleric",
    name: "Cleric",
    description: `Combat Healer | Convert your attacks into healing for the most injured ally.
Focus: Sustain, hybrid damage/support.`,
    moveRange: 2,
    attackPower: 3,
    attackRange: 1,
    stats: {
      hp: 14,
      attack: 3,
      defense: 1,
      accuracy: 0,
      agility: 12,
    },
    skill: "heal",
    upgrades: []
  },
  {
    id: "monk",
    name: "Monk",
    description: `Evasive Support | Dodge attacks and heal yourself while baiting enemy focus.
Focus: Self-sustain, distraction.`,
    moveRange: 2,
    attackPower: 4,
    attackRange: 1,
    stats: {
      hp: 18,
      attack: 4,
      defense: 1,
      accuracy: 0,
      agility: 10,
    },
    skill: "heal",
    upgrades: []
  },


];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

