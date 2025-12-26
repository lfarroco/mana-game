import { PoisonSystemState } from "./PoisonDamageSystem";
import { RegenSystemState } from "./RegenSystem";
import { CombatStatsTrackerState } from "./CombatStatsTracker";

type CombatSystemStates = {
	poisonSystemState: PoisonSystemState;
	regenSystemState: RegenSystemState;
	combatStatsTrackerState: CombatStatsTrackerState;
	forceStatsState: any;
};

let currentCombatStates: CombatSystemStates | null = null;

export function setCombatSystemStates(states: CombatSystemStates) {
	currentCombatStates = states;
};

export function getCombatSystemStates(): CombatSystemStates {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	return currentCombatStates;
};

export function updatePoisonSystemState(state: PoisonSystemState): void {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.poisonSystemState = state;
};

export function updateRegenSystemState(state: RegenSystemState): void {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.regenSystemState = state;
};

export function updateCombatStatsTrackerState(state: CombatStatsTrackerState): void {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.combatStatsTrackerState = state;
};

export function updateForceStatsState(state: any) {
	if (!currentCombatStates) {
		throw new Error("Combat system states not initialized");
	}
	currentCombatStates.forceStatsState = state;
}

export function clearCombatSystemStates() {
	currentCombatStates = null;
};
