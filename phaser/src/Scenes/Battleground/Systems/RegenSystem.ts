import { Force, manipulateForceMorale } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";

export const tickInterval: number = 1000;
let isActive = false;

const regenPool: Map<string, number> = new Map();
const timeSinceLastTick: Map<string, number> = new Map();
const sourceContributions: Map<string, Map<string, number>> = new Map();

export function initialize(): void {
	isActive = true;
	regenPool.clear();
	timeSinceLastTick.clear();
	sourceContributions.clear();
}

export function applyRegen(targetForce: Force, amount: number, sourceUnitId?: string): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	const newTotal = (regenPool.get(id) || 0) + amount;
	regenPool.set(id, newTotal);
	if (!timeSinceLastTick.has(id)) timeSinceLastTick.set(id, 0);
	if (sourceUnitId) {
		if (!sourceContributions.has(id)) sourceContributions.set(id, new Map());
		const contribs = sourceContributions.get(id)!;
		contribs.set(sourceUnitId, (contribs.get(sourceUnitId) || 0) + amount);
	}
	console.log(`[RegenSystem] Added ${amount} regen to ${id}. Pool=${newTotal}`);
}

export function update(playerForce: Force, cpuForce: Force, delta: number): void {
	if (!isActive) return;
	tickForce(playerForce, delta);
	tickForce(cpuForce, delta);
}

function tickForce(force: Force, delta: number) {
	const id = force.id;
	if (!timeSinceLastTick.has(id)) return;
	const acc = (timeSinceLastTick.get(id) || 0) + delta;
	if (acc < tickInterval) {
		timeSinceLastTick.set(id, acc);
		return;
	}

	timeSinceLastTick.set(id, acc - tickInterval);
	const healing = regenPool.get(id) || 0;
	if (healing <= 0) return;
	console.log(`[RegenSystem] Regen tick on ${id}: ${healing} healing`);

	const actualHealing = manipulateForceMorale(force, healing);

	// Attribute healing to contributors proportionally
	const contribs = sourceContributions.get(id);
	if (contribs && actualHealing > 0) {
		let totalContrib = 0;
		contribs.forEach(v => totalContrib += v);
		if (totalContrib > 0) {
			contribs.forEach((v, s) => {
				const share = (v / totalContrib) * actualHealing;
				CombatStatsTracker.trackHealing(s, share, 'regen');
			});
		}
	}

	if (actualHealing > 0) {
		reducePoison(id, actualHealing);
	}
}

export function getTotalRegenHealing(forceId: string): number {
	return regenPool.get(forceId) || 0;
}

export function clearRegen(forceId: string): void {
	regenPool.delete(forceId);
	timeSinceLastTick.delete(forceId);
	sourceContributions.delete(forceId);
}

export function stop(): void {
	isActive = false;
	regenPool.clear();
	timeSinceLastTick.clear();
	sourceContributions.clear();
}

export function getConfig() {
	return {
		tickInterval,
		isActive,
		activeForces: regenPool.size,
	};
}
