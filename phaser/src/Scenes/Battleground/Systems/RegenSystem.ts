import { Force } from "@Models/Entities/Force";
import { updateRegenDisplay } from "../ForceStats";

const regenStates: Map<string, number> = new Map();

export function initialize(): void {
	regenStates.clear();
}

export function applyRegen(
	targetForce: Force,
	amount: number,
	_critical = false
): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let currentRate = regenStates.get(id) || 0;

	currentRate += amount;
	regenStates.set(id, currentRate);

	updateRegenDisplay(targetForce.id, currentRate, amount);
}

export function getTickAmount(forceId: string): number {
	return regenStates.get(forceId) || 0;
}

export function clearRegen(forceId: string) {
	const oldRate = getRegenRate(forceId);
	regenStates.delete(forceId);
	updateRegenDisplay(forceId, 0, -oldRate);
}

export function getRegenRate(forceId: string): number {
	return regenStates.get(forceId) || 0;
}

export function stop() {
	regenStates.clear();
}
