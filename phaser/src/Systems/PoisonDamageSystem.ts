import * as Force from "@Models/Entities/Force";

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
	targetForce: Force.Force,
	amount: number,
	_isCritical = false,
): PoisonSystemState {
	if (amount <= 0) return poisonState;
	const id = targetForce.id;
	const currentRate = poisonState.poisonRates.get(id) || 0;

	const newRate = currentRate + amount;
	const newRates = new Map(poisonState.poisonRates);
	newRates.set(id, newRate);

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
): PoisonSystemState {
	if (healAmount < 20) return poisonState;
	const currentRate = poisonState.poisonRates.get(forceId);
	if (!currentRate || currentRate === 0) return poisonState;

	const reduction = Math.min(currentRate, Math.floor(healAmount * 0.05));
	const newRate = currentRate - reduction;

	const newRates = new Map(poisonState.poisonRates);
	if (newRate <= 0) {
		newRates.delete(forceId);
	} else {
		newRates.set(forceId, newRate);
	}

	return {
		...poisonState,
		poisonRates: newRates,
	};
}

export function clearPoison(
	poisonState: PoisonSystemState,
	forceId: string,
): PoisonSystemState {
	const newRates = new Map(poisonState.poisonRates);
	newRates.delete(forceId);

	return {
		...poisonState,
		poisonRates: newRates,
	};
}

export function getPoisonRate(poisonState: PoisonSystemState, forceId: string): number {
	return poisonState.poisonRates.get(forceId) || 0;
}