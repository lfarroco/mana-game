import { RNGManager } from "./Random";

export const diceRoll = (n: number) => RNGManager.getInstance().range(1, n);
