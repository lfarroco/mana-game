import { Force } from "@Models/Entities/Force";
import { updatePoisonDisplay } from "../ForceStats";

const poisonStates: Map<string, number> = new Map();

export function initialize(): void {
	poisonStates.clear();
}

export function applyPoison(
	targetForce: Force,
	amount: number,
	_isCritical = false
): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let currentRate = poisonStates.get(id) || 0;

	currentRate += amount;
	poisonStates.set(id, currentRate);

	updatePoisonDisplay(targetForce.id, currentRate, amount);
}

export function getTickAmount(forceId: string): number {
	return poisonStates.get(forceId) || 0;
}

export function reducePoison(forceId: string, healAmount: number): void {
	if (healAmount < 20) return;
	let currentRate = poisonStates.get(forceId);
	if (!currentRate || currentRate === 0) return;

	const reduction = Math.min(currentRate, Math.floor(healAmount * 0.05));
	currentRate -= reduction;

	if (currentRate <= 0) {
		poisonStates.delete(forceId);
		currentRate = 0;
	} else {
		poisonStates.set(forceId, currentRate);
	}
	updatePoisonDisplay(forceId, currentRate, -reduction);
}

export function clearPoison(forceId: string): void {
	poisonStates.delete(forceId);
	updatePoisonDisplay(forceId, 0, 0);
}

export function getPoisonRate(forceId: string): number {
	return poisonStates.get(forceId) || 0;
}

export function stop() {
	poisonStates.clear();
}
