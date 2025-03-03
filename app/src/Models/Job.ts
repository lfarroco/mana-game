export type Job = {
  id: string;
  name: string;
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
    id: "apprentice",
    name: "Apprentice",
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
    skill: "fireball",
    upgrades: [
      "elementalist",
      "arcanist"
    ]
  },
  {
    id: "blob",
    name: "Green Blob",
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
  }

];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

