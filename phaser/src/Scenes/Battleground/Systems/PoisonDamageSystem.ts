import { applyDamageToForce, Force } from "../../../Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";

export type PoisonStack = {
	totalDamage: number;
	damagePerTick: number;
	remainingDamage: number;
	timeSinceLastTick: number;
	sourceUnitId?: string;
};

export const tickInterval: number = 1000;
let isActive: boolean = false;

const poisonStacks: Map<string, PoisonStack[]> = new Map();

export function initialize(): void {
	isActive = true;
	poisonStacks.clear();
}

export function applyPoison(targetForce: Force, amount: number, sourceUnitId?: string): void {
	if (amount <= 0) return;

	const forceId = targetForce.id;
	if (!poisonStacks.has(forceId)) {
		poisonStacks.set(forceId, []);
	}

	const stacks = poisonStacks.get(forceId)!;

	const damagePerTick = Math.max(1, Math.floor(amount / 10));

	stacks.push({
		totalDamage: amount,
		damagePerTick: damagePerTick,
		remainingDamage: amount,
		timeSinceLastTick: 0,
		sourceUnitId
	});

	const ticksRequired = Math.ceil(amount / damagePerTick);
	console.log(`[PoisonDamageSystem] Applied ${amount} poison to force ${forceId} (${damagePerTick} per tick, ${ticksRequired} ticks)`);
}

export function update(playerForce: Force, cpuForce: Force, delta: number): void {
	if (!isActive) return;

	updateForcePoison(playerForce, delta);
	updateForcePoison(cpuForce, delta);
}

function updateForcePoison(force: Force, delta: number): void {
	const forceId = force.id;
	const stacks = poisonStacks.get(forceId);

	if (!stacks || stacks.length === 0) return;

	for (let i = stacks.length - 1; i >= 0; i--) {
		const stack = stacks[i];
		stack.timeSinceLastTick += delta;

		if (stack.timeSinceLastTick >= tickInterval) {
			const damage = Math.min(stack.damagePerTick, stack.remainingDamage);
			console.log(`[PoisonDamageSystem] Poison tick on ${forceId}: ${damage} damage (${stack.remainingDamage} remaining)`);

			applyDamageToForce(force, damage, 0, "poison");

			if (stack.sourceUnitId) {
				CombatStatsTracker.trackDamage(stack.sourceUnitId, damage, 'poison');
			}

			stack.remainingDamage = Math.max(0, stack.remainingDamage - damage);
			stack.timeSinceLastTick = 0;

			if (stack.remainingDamage <= 0) {
				stacks.splice(i, 1);
				console.log(`[PoisonDamageSystem] Poison stack expired for force ${forceId}`);
			}
		}
	}
}

export function reducePoison(forceId: string, healAmount: number): void {
	const stacks = poisonStacks.get(forceId);
	if (!stacks || stacks.length === 0) return;

	const poisonReduction = Math.floor((healAmount / 10) * 2.5);
	if (poisonReduction <= 0) return;

	console.log(`[PoisonDamageSystem] Healing ${healAmount} reduces poison by ${poisonReduction} for force ${forceId}`);

	let remainingReduction = poisonReduction;

	for (let i = stacks.length - 1; i >= 0 && remainingReduction > 0; i--) {
		const stack = stacks[i];
		const reduction = Math.min(remainingReduction, stack.remainingDamage);

		stack.remainingDamage -= reduction;
		remainingReduction -= reduction;

		console.log(`[PoisonDamageSystem] Reduced poison stack ${i} by ${reduction}, now ${stack.remainingDamage} remaining`);

		if (stack.remainingDamage <= 0) {
			stacks.splice(i, 1);
			console.log(`[PoisonDamageSystem] Poison stack ${i} completely neutralized`);
		}
	}

	if (stacks.length === 0) {
		poisonStacks.delete(forceId);
	}
}

export function getTotalPoisonDamage(forceId: string): number {
	const stacks = poisonStacks.get(forceId);
	if (!stacks) return 0;

	return stacks.reduce((total, stack) => total + stack.remainingDamage, 0);
}

export function getPoisonStacks(forceId: string): PoisonStack[] {
	return poisonStacks.get(forceId) || [];
}

export function clearPoison(forceId: string): void {
	poisonStacks.delete(forceId);
}

export function stop(): void {
	isActive = false;
	poisonStacks.clear();
}

export function getConfig() {
	return {
		tickInterval,
		isActive,
		totalStacks: Array.from(poisonStacks.values()).reduce((total, stacks) => total + stacks.length, 0)
	};
}
