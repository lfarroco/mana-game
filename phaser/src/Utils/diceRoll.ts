import { range } from "@Utils/Random";

export const diceRoll = (seed: number, min: number, max: number) => range(seed, min, max);
