export type Job = {
  id: string;
  name: string;
  gold: number;
  attackType: "melee" | "ranged";
  stats: {
    hp: number;
    attack: number;
    defense: number;
    mgkAttack: number;
    mgkDefense: number;
    accuracy: number;
    agility: number;
  };
  // TODO:
  //animations: string[]
};

export const jobs: Job[] = [
  {
    id: "archer",
    name: "Archer",
    gold: 100,
    attackType: "ranged",
    stats: {
      hp: 260,
      attack: 17,
      defense: 0,
      mgkAttack: 0,
      mgkDefense: 0,
      accuracy: 10,
      agility: 10,
    },
  },
  {
    id: "monk",
    name: "Monk",
    gold: 100,
    attackType: "melee",
    stats: {
      hp: 480,
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
    gold: 100,
    attackType: "melee",
    stats: {
      hp: 280,
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
    gold: 100,
    attackType: "melee",
    stats: {
      hp: 400,
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
    gold: 100,
    attackType: "ranged",
    stats: {
      hp: 200,
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
    gold: 50,
    attackType: "melee",
    stats: {
      hp: 100,
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

