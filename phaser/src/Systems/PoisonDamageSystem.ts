import { Force } from "@Models/Entities/Force";
import { CombatEffects } from "@Scenes/Battleground/CombatEnvironment";

export type PoisonSystemState = {
	poisonRates: Map<string, number>;
};

export function initializePoisonSystem(): PoisonSystemState {
	return {
		poisonRates: new Map(),
	};
}

export function applyPoison(
	poisonState: PoisonSystemState,
	targetForce: Force,
	amount: number,
	_isCritical = false,
	effects?: CombatEffects
): PoisonSystemState {
	if (amount <= 0) return poisonState;
	const id = targetForce.id;
	const currentRate = poisonState.poisonRates.get(id) || 0;

	const newRate = currentRate + amount;
	const newRates = new Map(poisonState.poisonRates);
	newRates.set(id, newRate);

	if (effects) {
		effects.updatePoisonDisplay(targetForce.id, newRate, amount);
	}

	return {
		...poisonState,
		poisonRates: newRates,
	};
}

export function getTickAmount(poisonState: PoisonSystemState, forceId: string): number {
	return poisonState.poisonRates.get(forceId) || 0;
}

export function reducePoison(
	poisonState: PoisonSystemState,
	forceId: string,
	healAmount: number,
	effects?: CombatEffects
): PoisonSystemState {
	if (healAmount < 20) return poisonState;
	const currentRate = poisonState.poisonRates.get(forceId);
	if (!currentRate || currentRate === 0) return poisonState;

	const reduction = Math.min(currentRate, Math.floor(healAmount * 0.05));
	const newRate = currentRate - reduction;

	const newRates = new Map(poisonState.poisonRates);
	if (newRate <= 0) {
		newRates.delete(forceId);
		if (effects) effects.updatePoisonDisplay(forceId, 0, -reduction);
	} else {
		newRates.set(forceId, newRate);
		if (effects) effects.updatePoisonDisplay(forceId, newRate, -reduction);
	}

	return {
		...poisonState,
		poisonRates: newRates,
	};
}

export function clearPoison(
	poisonState: PoisonSystemState,
	forceId: string,
	effects?: CombatEffects
): PoisonSystemState {
	const newRates = new Map(poisonState.poisonRates);
	newRates.delete(forceId);
	newRates.delete(forceId);

	if (effects) {
		effects.updatePoisonDisplay(forceId, 0, 0);
	}

	return {
		...poisonState,
		poisonRates: newRates,
	};
}

export function getPoisonRate(poisonState: PoisonSystemState, forceId: string): number {
	return poisonState.poisonRates.get(forceId) || 0;
}
