import * as PoisonDamageSystem from "./PoisonDamageSystem";
import * as RegenSystem from "./RegenSystem";
import * as CombatStatsTracker from "./CombatStatsTracker";

export type CombatSystemStates = {
	poisonSystemState: PoisonDamageSystem.PoisonSystemState;
	regenSystemState: RegenSystem.RegenSystemState;
	combatStatsTrackerState: CombatStatsTracker.CombatStatsTrackerState;
};

// Global storage for Browser UI / Legacy access
let currentCombatStates: CombatSystemStates | null = null;

export const setCombatSystemStates = (states: CombatSystemStates) => {
	currentCombatStates = states;
};

export const getCombatSystemStates = (): CombatSystemStates => {
	if (!currentCombatStates) {
		throw new Error("CombatSystemStates not initialized");
	}
	return currentCombatStates;
};

export const isInitialized = (): boolean => {
	return currentCombatStates !== null;
};

// Helper update functions required by PhaseManager
export const updateRegenSystemState = (newState: RegenSystem.RegenSystemState) => {
	if (currentCombatStates) {
		currentCombatStates.regenSystemState = newState;
	}
};

export const updatePoisonSystemState = (newState: PoisonDamageSystem.PoisonSystemState) => {
	if (currentCombatStates) {
		currentCombatStates.poisonSystemState = newState;
	}
};


