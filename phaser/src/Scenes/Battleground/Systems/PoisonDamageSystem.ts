import { applyDamageToForce, cpuForce, Force, playerForce } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { getCurrentScene } from "@Models/State";
import { popText } from "@Systems/Chara/Animations";
import { getCharaById } from "@Systems/Chara/Chara";

const tickInterval: number = 1000;

let poisonTimer: Phaser.Time.TimerEvent;

type PoisonState = {
	rate: number;
	accumulator: number;
	sourceContributions?: Map<string, number>;
}

const poisonStates: Map<string, PoisonState> = new Map();

export function initialize(): void {
	poisonStates.clear();
	poisonTimer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick,
		loop: true,
	});
}

export function applyPoison(targetForce: Force, amount: number, sourceUnitId?: string, isCritical = false): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let state = poisonStates.get(id);
	if (!state) {
		state = { rate: 0, accumulator: 0 };
		poisonStates.set(id, state);
	}
	state.rate += amount;
	if (sourceUnitId) {
		if (!state.sourceContributions) state.sourceContributions = new Map();
		const contribs = state.sourceContributions;
		contribs.set(sourceUnitId, (contribs.get(sourceUnitId) || 0) + amount);
	}

	popText({
		x: getCharaById(id).x,
		y: getCharaById(id).y,
		text: isCritical ? `${amount} Crit!` : amount.toString(),
		type: "poison",
		critical: isCritical
	})
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
	state.accumulator = (state.accumulator + state.rate) - damage;
	if (damage <= 0) return;
	applyDamageToForce(force, damage, 0, "poison", false);

	const contribs = state.sourceContributions;
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
	const state = poisonStates.get(forceId);
	if (!state || state.rate === 0) return;
	const reduction = Math.min(state.rate, Math.floor(healAmount * 0.25));
	state.rate -= reduction;
	// Scale down contributions proportionally to keep ratios
	const contribs = state.sourceContributions;
	if (contribs && state.rate > 0 && (state.rate - reduction) > 0) {
		const newRate = state.rate - reduction;
		contribs.forEach((v, k) => {
			const scaled = (v / state.rate) * newRate;
			contribs.set(k, scaled);
		});
		state.rate = newRate;
	} else if (contribs && state.rate - reduction === 0) {
		contribs.clear();
		state.rate = 0;
	}
	if (state.rate === 0) {
		poisonStates.delete(forceId);
	}
}

export function clearPoison(forceId: string): void {
	poisonStates.delete(forceId);
}

export function stop() {
	poisonTimer.destroy();
	poisonStates.clear();
}
