export type Job = {
  id: string;
  name: string;
  gold: number;
  moveRange: number;
  attackRange: number;
  attackPower: number;
  dices: number;
  stats: {
    hp: number;
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
    moveRange: 3,
    attackRange: 2,
    attackPower: 10,
    dices: 1,
    stats: {
      hp: 360,
      attack: 17,
      defense: 0,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 10,
    },
    skill: "slash"
  },
  {
    id: "monk",
    name: "Monk",
    moveRange: 3,
    gold: 100,
    attackPower: 5,
    attackRange: 1,
    dices: 3,
    stats: {
      hp: 480,
      attack: 11,
      defense: 4,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 8,
      agility: 6,
    },
    skill: "slash"
  },
  {
    id: "cleric",
    name: "Cleric",
    moveRange: 2,
    gold: 100,
    attackPower: 15,
    attackRange: 1,
    dices: 1,
    stats: {
      hp: 180,
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
    moveRange: 3,
    gold: 100,
    attackRange: 1,
    attackPower: 10,
    dices: 2,
    stats: {
      hp: 400,
      attack: 10,
      defense: 10,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 8,
    },
    skill: "slash"
  },
  {
    id: "wizard",
    name: "Wizard",
    moveRange: 2,
    gold: 100,
    attackPower: 20,
    attackRange: 3,
    dices: 1,
    stats: {
      hp: 200,
      attack: 0,
      defense: 0,
      mgkAttack: 20,
      mgkDefense: 20,
      accuracy: 0,
      agility: 4,
    },
    skill: "fireball"
  },
  {
    id: "orc",
    name: "Orc",
    moveRange: 3,
    gold: 100,
    attackRange: 1,
    attackPower: 10,
    dices: 2,
    stats: {
      hp: 60,
      attack: 10,
      defense: 10,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 8,
    },
    skill: "slash"
  },
];

export const getJob = (id: string): Job => {
  const job = jobs.find((j) => j.id === id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
};

