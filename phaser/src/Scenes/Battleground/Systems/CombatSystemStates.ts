import { PoisonSystemState } from "@Scenes/Battleground/Systems/PoisonDamageSystem";
import { RegenSystemState } from "@Scenes/Battleground/Systems/RegenSystem";

type CombatSystemStates = {
	poisonSystemState: PoisonSystemState;
	regenSystemState: RegenSystemState;
};

let currentCombatStates: CombatSystemStates | null = null;

export const setCombatSystemStates = (states: CombatSystemStates): void => {
	currentCombatStates = states;
};

export const getCombatSystemStates = (): CombatSystemStates => {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	return currentCombatStates;
};

export const updatePoisonSystemState = (state: PoisonSystemState): void => {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.poisonSystemState = state;
};

export const updateRegenSystemState = (state: RegenSystemState): void => {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.regenSystemState = state;
};

export const clearCombatSystemStates = (): void => {
	currentCombatStates = null;
};
