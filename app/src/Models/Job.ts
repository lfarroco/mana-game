export type Job = {
  id: string;
  name: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    mgkAttack: number;
    mgkDefense: number;
    accuracy: number;
    agility: number;
  };
};

export const jobs = [
  {
    id: "archer",
    name: "Archer",
    stats: {
      hp: 260,
      maxHp: 260,
      attack: 17,
      defense: 0,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 10,
    },
  },
  {
    id: "barbarian",
    name: "Barbarian",
    stats: {
      hp: 480,
      maxHp: 480,
      attack: 11,
      defense: 4,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 8,
      agility: 6,
    },
  },
  {
    id: "cleric",
    name: "Cleric",
    stats: {
      hp: 280,
      maxHp: 280,
      attack: 0,
      defense: 2,
      mgkAttack: 13,
      mgkDefense: 20,
      accuracy: 0,
      agility: 4,
    },
  },
  {
    id: "soldier",
    name: "soldier",
    stats: {
      hp: 400,
      maxHp: 400,
      attack: 10,
      defense: 10,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 8,
    },
  },
  {
    id: "wizard",
    name: "Wizard",
    stats: {
      hp: 200,
      maxHp: 200,
      attack: 0,
      defense: 0,
      mgkAttack: 20,
      mgkDefense: 20,
      accuracy: 0,
      agility: 4,
    },
  },
  {
    id: "skeleton",
    name: "Skeleton",
    stats: {
      hp: 100,
      maxHp: 100,
      attack: 10,
      defense: 0,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 10,
    },
  },
];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

