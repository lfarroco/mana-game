import { applyDamageToForce, Force } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";


export const tickInterval: number = 1000;
// TODO: this can be simplified if the parent controls if in combat or not
let isActive = false;

const poisonPool: Map<string, number> = new Map();
const timeSinceLastTick: Map<string, number> = new Map();
const sourceContributions: Map<string, Map<string, number>> = new Map();

export function initialize(): void {
	isActive = true;
	poisonPool.clear();
	timeSinceLastTick.clear();
	sourceContributions.clear();
}

export function applyPoison(targetForce: Force, amount: number, sourceUnitId?: string): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	const newTotal = (poisonPool.get(id) || 0) + amount;
	poisonPool.set(id, newTotal);
	if (!timeSinceLastTick.has(id)) timeSinceLastTick.set(id, 0);
	if (sourceUnitId) {
		if (!sourceContributions.has(id)) sourceContributions.set(id, new Map());
		const contribs = sourceContributions.get(id)!;
		contribs.set(sourceUnitId, (contribs.get(sourceUnitId) || 0) + amount);
	}
	console.log(`[PoisonDamageSystem] Added ${amount} poison to ${id}. Pool=${newTotal}`);
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

	const damage = poisonPool.get(id) || 0;
	timeSinceLastTick.set(id, acc - tickInterval);
	if (damage <= 0) return;
	console.log(`[PoisonDamageSystem] Poison tick on ${id}: ${damage} damage`);
	applyDamageToForce(force, damage, 0, "poison");

	const contribs = sourceContributions.get(id);
	if (contribs) {
		let totalContrib = 0;
		contribs.forEach(v => totalContrib += v);
		if (totalContrib > 0) {
			contribs.forEach((v, s) => {
				const share = (v / totalContrib) * damage;
				CombatStatsTracker.trackDamage(s, share, 'poison');
			});
		}
	}
}

export function reducePoison(forceId: string, healAmount: number): void {
	if (healAmount <= 0) return;
	const current = poisonPool.get(forceId) || 0;
	if (current === 0) return;
	const reduction = Math.min(current, Math.floor(healAmount * 0.25));
	if (reduction <= 0) return;
	const newTotal = current - reduction;
	poisonPool.set(forceId, newTotal);
	// Scale down contributions proportionally to keep ratios
	const contribs = sourceContributions.get(forceId);
	if (contribs && current > 0 && newTotal > 0) {
		contribs.forEach((v, k) => {
			const scaled = (v / current) * newTotal;
			contribs.set(k, scaled);
		});
	} else if (contribs && newTotal === 0) {
		contribs.clear();
	}
	console.log(`[PoisonDamageSystem] Healing ${healAmount} reduced poison on ${forceId} by ${reduction}. Remaining=${newTotal}`);
}

export function getTotalPoisonDamage(forceId: string): number {
	return poisonPool.get(forceId) || 0;
}

export function clearPoison(forceId: string): void {
	poisonPool.delete(forceId);
	timeSinceLastTick.delete(forceId);
	sourceContributions.delete(forceId);
}

export function stop(): void {
	isActive = false;
	poisonPool.clear();
	timeSinceLastTick.clear();
	sourceContributions.clear();
}

export function getConfig() {
	return {
		tickInterval,
		isActive,
		activeForces: poisonPool.size
	};
}
