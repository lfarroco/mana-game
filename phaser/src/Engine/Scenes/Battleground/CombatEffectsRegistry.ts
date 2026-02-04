import { CombatEffects } from "./RunCombatCore.js";

let currentEffects: CombatEffects | null = null;

export const setCombatEffects = (effects: CombatEffects): void => {
	currentEffects = effects;
};

export const getCombatEffects = (): CombatEffects => {
	if (!currentEffects) {
		throw new Error("Combat effects not initialized");
	}
	return currentEffects;
};

export const clearCombatEffects = (): void => {
	currentEffects = null;
};
