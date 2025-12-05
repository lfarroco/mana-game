import { applyDamageToForce, cpuForce, Force, playerForce } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { getCurrentScene } from "@Models/State";
import { updatePoisonDisplay } from "../ForceStats";

const tickInterval: number = 1000;

let poisonTimer: Phaser.Time.TimerEvent;

type PoisonState = {
	rate: number;
	accumulator: number;
};

const poisonStates: Map<string, PoisonState> = new Map();

export function initialize(): void {
	poisonStates.clear();
	poisonTimer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick,
		loop: true,
	});
}

export function applyPoison(
	targetForce: Force,
	amount: number,
	sourceUnitId?: string,
	_isCritical = false
): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let state = poisonStates.get(id);
	if (!state) {
		state = { rate: 0, accumulator: 0 };
		poisonStates.set(id, state);
	}
	state.rate += amount;

	updatePoisonDisplay(targetForce.id, state.rate, amount);
}

export function tick() {
	tickForce(playerForce);
	tickForce(cpuForce);
}

function tickForce(force: Force): void {
	const id = force.id;
	const state = poisonStates.get(id);
	if (!state) return;
	const damage = Math.floor(state.accumulator + state.rate);
	state.accumulator = state.accumulator + state.rate - damage;
	if (damage <= 0) return;
	applyDamageToForce(force, damage, 0, "poison", false);

}

export function reducePoison(forceId: string, healAmount: number): void {
	if (healAmount <= 0) return;
	const state = poisonStates.get(forceId);
	if (!state || state.rate === 0) return;
	const reduction = Math.min(state.rate, Math.floor(healAmount * 0.05));
	state.rate -= reduction;

	if (state.rate === 0) {
		poisonStates.delete(forceId);
	}
	updatePoisonDisplay(forceId, state.rate, -reduction);
}

export function clearPoison(forceId: string): void {
	poisonStates.delete(forceId);
	updatePoisonDisplay(forceId, 0, 0);
}

export function getPoisonRate(forceId: string): number {
	const state = poisonStates.get(forceId);
	return state ? state.rate : 0;
}

export function stop() {
	poisonTimer.destroy();
	poisonStates.clear();
}
