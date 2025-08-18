import { Force, manipulateForceMorale } from "../../../Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";

export type RegenStack = {
	totalHealing: number;
	healingPerTick: number;
	remainingHealing: number;
	timeSinceLastTick: number;
	sourceUnitId?: string;
};

const TICK_INTERVAL = 1000;
let isActive: boolean = false;

const regenStacks: Map<string, RegenStack[]> = new Map();

export function initialize(): void {
	isActive = true;
	regenStacks.clear();
}

export function applyRegen(targetForce: Force, amount: number, sourceUnitId?: string): void {
	if (amount <= 0) return;

	const forceId = targetForce.id;
	if (!regenStacks.has(forceId)) {
		regenStacks.set(forceId, []);
	}

	const stacks = regenStacks.get(forceId)!;

	const healingPerTick = Math.max(1, Math.floor(amount / 10));

	stacks.push({
		totalHealing: amount,
		healingPerTick: healingPerTick,
		remainingHealing: amount,
		timeSinceLastTick: 0,
		sourceUnitId
	});

	const ticksRequired = Math.ceil(amount / healingPerTick);
	console.log(`[RegenSystem] Applied ${amount} regen to force ${forceId} (${healingPerTick} per tick, ${ticksRequired} ticks)`);
}

export function update(playerForce: Force, cpuForce: Force, delta: number): void {
	if (!isActive) return;

	updateForceRegen(playerForce, delta);
	updateForceRegen(cpuForce, delta);
}

function updateForceRegen(force: Force, delta: number): void {
	const forceId = force.id;
	const stacks = regenStacks.get(forceId);

	if (!stacks || stacks.length === 0) return;

	for (let i = stacks.length - 1; i >= 0; i--) {
		const stack = stacks[i];
		stack.timeSinceLastTick += delta;

		if (stack.timeSinceLastTick >= TICK_INTERVAL) {
			const healing = Math.min(stack.healingPerTick, stack.remainingHealing);
			console.log(`[RegenSystem] Regen tick on ${forceId}: ${healing} healing (${stack.remainingHealing} remaining)`);

			const actualHealing = manipulateForceMorale(force, healing);

			if (stack.sourceUnitId && actualHealing > 0) {
				CombatStatsTracker.trackHealing(stack.sourceUnitId, actualHealing, 'regen');
			}

			if (actualHealing > 0) {
				reducePoison(forceId, actualHealing);
			}

			stack.remainingHealing = Math.max(0, stack.remainingHealing - healing);
			stack.timeSinceLastTick = 0;

			if (stack.remainingHealing <= 0) {
				stacks.splice(i, 1);
				console.log(`[RegenSystem] Regen stack expired for force ${forceId}`);
			}
		}
	}
}

export function getTotalRegenHealing(forceId: string): number {
	const stacks = regenStacks.get(forceId);
	if (!stacks) return 0;

	return stacks.reduce((total, stack) => total + stack.remainingHealing, 0);
}

export function getRegenStacks(forceId: string): RegenStack[] {
	return regenStacks.get(forceId) || [];
}

export function clearRegen(forceId: string): void {
	regenStacks.delete(forceId);
}

export function stop(): void {
	isActive = false;
	regenStacks.clear();
}

export function getConfig() {
	return {
		tickInterval: TICK_INTERVAL,
		isActive,
		totalStacks: Array.from(regenStacks.values())
			.reduce((total, stacks) => total + stacks.length, 0)
	};
}
