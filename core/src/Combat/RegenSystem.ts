
export type RegenSystemState = {
	regenRates: Map<string, number>;
};

export function initializeRegenSystem(): RegenSystemState {
	return {
		regenRates: new Map(),
	};
}

export function applyRegen(
	regenState: RegenSystemState,
	targetForce: string,
	amount: number,
	_critical = false,
): RegenSystemState {
	if (amount <= 0) return regenState;
	const currentRate = regenState.regenRates.get(targetForce) || 0;

	const newRate = currentRate + amount;
	const newRates = new Map(regenState.regenRates);
	newRates.set(targetForce, newRate);

	return {
		...regenState,
		regenRates: newRates,
	};
}

export function clearRegen(
	regenState: RegenSystemState,
	forceId: string,
): RegenSystemState {
	const newRates = new Map(regenState.regenRates);
	newRates.delete(forceId);

	return {
		...regenState,
		regenRates: newRates,
	};
}

export function getRegenRate(regenState: RegenSystemState, forceId: string): number {
	return regenState.regenRates.get(forceId) || 0;
}