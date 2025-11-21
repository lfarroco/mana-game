import { cpuForce, Force, manipulateCoreLife, playerForce } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";
import { getCurrentScene } from "@Models/State";
import { updateRegenDisplay } from "../ForceStats";

const tickInterval: number = 1000;

let regenTimer: Phaser.Time.TimerEvent;

type RegenState = {
	rate: number;
	accumulator: number;
	sourceContributions?: Map<string, number>;
};

const regenStates: Map<string, RegenState> = new Map();

export function initialize(): void {
	regenStates.clear();
	regenTimer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick,
		loop: true,
	});
}

export function applyRegen(
	targetForce: Force,
	amount: number,
	sourceUnitId?: string,
	_critical = false
): void {
	if (amount <= 0) return;
	const id = targetForce.id;
	let state = regenStates.get(id);
	if (!state) {
		state = { rate: 0, accumulator: 0 };
		regenStates.set(id, state);
	}
	state.rate += amount;
	if (sourceUnitId) {
		if (!state.sourceContributions) state.sourceContributions = new Map();
		const contribs = state.sourceContributions;
		contribs.set(sourceUnitId, (contribs.get(sourceUnitId) || 0) + amount);
	}

	updateRegenDisplay(targetForce.id, state.rate, amount);
}

function tick() {
	tickForce(playerForce);
	tickForce(cpuForce);
}

function tickForce(force: Force): void {
	const id = force.id;
	const state = regenStates.get(id);
	if (!state) return;
	const healing = Math.floor(state.accumulator + state.rate);
	state.accumulator = state.accumulator + state.rate - healing;
	if (healing <= 0) return;

	const actualHealing = manipulateCoreLife(force, healing);

	// Attribute healing to contributors proportionally
	const contribs = state.sourceContributions;
	if (contribs && actualHealing > 0) {
		let totalContrib = 0;
		contribs.forEach((v) => (totalContrib += v));
		if (totalContrib > 0) {
			contribs.forEach((v, s) => {
				const share = (v / totalContrib) * actualHealing;
				CombatStatsTracker.trackHealing(s, share, "regen");
			});
		}
	}

	if (actualHealing > 0) {
		reducePoison(id, actualHealing);
	}
}

export function clearRegen(forceId: string) {
	const oldRate = getRegenRate(forceId);
	regenStates.delete(forceId);
	updateRegenDisplay(forceId, 0, -oldRate);
}

export function getRegenRate(forceId: string): number {
	const state = regenStates.get(forceId);
	return state ? state.rate : 0;
}

export function stop() {
	regenStates.clear();
	regenTimer.destroy();
}
