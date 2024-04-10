export type Job = {
  id: string;
  name: string;
  gold: number;
  attackRange: number;
  attackPower: number;
  dices: number;
  stats: {
    hp: number;
    mana: number;
    attack: number;
    defense: number;
    mgkAttack: number;
    mgkDefense: number;
    accuracy: number;
    agility: number;
  };
  skill: string
};

export const jobs: Job[] = [
  {
    id: "archer",
    name: "Archer",
    gold: 100,
    attackRange: 2,
    attackPower: 10,
    dices: 1,
    stats: {
      hp: 260,
      mana: 100,
      attack: 17,
      defense: 0,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 10,
    },
    skill: ""
  },
  {
    id: "monk",
    name: "Monk",
    gold: 100,
    attackPower: 5,
    attackRange: 1,
    dices: 3,
    stats: {
      hp: 480,
      mana: 100,
      attack: 11,
      defense: 4,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 8,
      agility: 6,
    },
    skill: ""
  },
  {
    id: "cleric",
    name: "Cleric",
    gold: 100,
    attackPower: 15,
    attackRange: 1,
    dices: 1,
    stats: {
      hp: 280,
      mana: 100,
      attack: 0,
      defense: 2,
      mgkAttack: 13,
      mgkDefense: 20,
      accuracy: 0,
      agility: 4,
    },
    skill: "heal"
  },
  {
    id: "soldier",
    name: "Soldier",
    gold: 100,
    attackRange: 1,
    attackPower: 10,
    dices: 2,
    stats: {
      hp: 400,
      mana: 0,
      attack: 10,
      defense: 10,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 8,
    },
    skill: ""
  },
  {
    id: "wizard",
    name: "Wizard",
    gold: 100,
    attackPower: 20,
    attackRange: 3,
    dices: 1,
    stats: {
      hp: 200,
      mana: 100,
      attack: 0,
      defense: 0,
      mgkAttack: 20,
      mgkDefense: 20,
      accuracy: 0,
      agility: 4,
    },
    skill: "fireball"
  },
];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

