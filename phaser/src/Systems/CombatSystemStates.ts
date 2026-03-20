import { PoisonSystemState } from "@Systems/PoisonDamageSystem";
import { RegenSystemState } from "@Systems/RegenSystem";
import { CombatStatsTrackerState } from "@Systems/CombatStatsTracker";
import type { ForceStatsState } from "@Scenes/Battleground/ForceStats";

export type CombatSystemStates = {
	poisonSystemState: PoisonSystemState;
	regenSystemState: RegenSystemState;
	combatStatsTrackerState: CombatStatsTrackerState;
	forceStatsState: ForceStatsState;
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
export const updateRegenSystemState = (newState: RegenSystemState) => {
	if (currentCombatStates) {
		currentCombatStates.regenSystemState = newState;
	}
};

export const updatePoisonSystemState = (newState: PoisonSystemState) => {
	if (currentCombatStates) {
		currentCombatStates.poisonSystemState = newState;
	}
};

export const updateForceStatsState = (newState: ForceStatsState) => {
	if (currentCombatStates) {
		currentCombatStates.forceStatsState = newState;
	}
};
