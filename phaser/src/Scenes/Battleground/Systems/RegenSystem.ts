import { Force, manipulateCorePower } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";

export const tickInterval: number = 1000;

interface RegenState {
	rate: number;
	accumulator: number;
	timeSinceLastTick: number;
	sourceContributions?: Map<string, number>;
}

const regenStates: Map<string, RegenState> = new Map();

export function initialize(): void {
	regenStates.clear();
}

export function applyRegen(targetForce: Force, amount: number, sourceUnitId?: string): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let state = regenStates.get(id);
	if (!state) {
		state = { rate: 0, accumulator: 0, timeSinceLastTick: 0 };
		regenStates.set(id, state);
	}
	state.rate += amount;
	if (sourceUnitId) {
		if (!state.sourceContributions) state.sourceContributions = new Map();
		const contribs = state.sourceContributions;
		contribs.set(sourceUnitId, (contribs.get(sourceUnitId) || 0) + amount);
	}
	// REQUIRED: update display
}

export function update(playerForce: Force, cpuForce: Force, delta: number): void {
	tickForce(playerForce, delta);
	tickForce(cpuForce, delta);
}

function tickForce(force: Force, delta: number): void {
	const id = force.id;
	const state = regenStates.get(id);
	if (!state) return;
	state.timeSinceLastTick += delta;
	if (state.timeSinceLastTick < tickInterval) return;
	const healing = Math.floor(state.accumulator + state.rate);
	state.timeSinceLastTick -= tickInterval;
	state.accumulator = (state.accumulator + state.rate) - healing;
	if (healing <= 0) return;

	const actualHealing = manipulateCorePower(force, healing);

	// Attribute healing to contributors proportionally
	const contribs = state.sourceContributions;
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

	// REQUIRED: update display
}

export function getTotalRegenHealing(forceId: string): number {
	return regenStates.get(forceId)?.rate || 0;
}

export function clearRegen(forceId: string): void {
	regenStates.delete(forceId);
}

export function stop(): void {
	regenStates.clear();
}

export function getConfig() {
	return {
		tickInterval,
		activeForces: regenStates.size,
	};
}
