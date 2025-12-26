import { Force } from "@Models/Entities/Force";
import * as CombatEffectsRegistry from "../CombatEffectsRegistry";

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
	targetForce: Force,
	amount: number,
	_critical = false
): RegenSystemState {
	if (amount <= 0) return regenState;
	const id = targetForce.id;
	const currentRate = regenState.regenRates.get(id) || 0;

	const newRate = currentRate + amount;
	const newRates = new Map(regenState.regenRates);
	newRates.set(id, newRate);

	const effects = CombatEffectsRegistry.getCombatEffects();
	effects.updateRegenDisplay(targetForce.id, newRate, amount);

	return {
		...regenState,
		regenRates: newRates,
	};
}

export function getTickAmount(regenState: RegenSystemState, forceId: string): number {
	return regenState.regenRates.get(forceId) || 0;
}

export function clearRegen(
	regenState: RegenSystemState,
	forceId: string
): RegenSystemState {
	const oldRate = getRegenRate(regenState, forceId);
	const newRates = new Map(regenState.regenRates);
	newRates.delete(forceId);
	newRates.delete(forceId);
	const effects = CombatEffectsRegistry.getCombatEffects();
	effects.updateRegenDisplay(forceId, 0, -oldRate);

	return {
		...regenState,
		regenRates: newRates,
	};
}

export function getRegenRate(regenState: RegenSystemState, forceId: string): number {
	return regenState.regenRates.get(forceId) || 0;
}
