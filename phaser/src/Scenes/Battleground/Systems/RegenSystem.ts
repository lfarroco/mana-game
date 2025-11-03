import { cpuForce, Force, manipulateCorePower, playerForce } from "@Models/Entities/Force";
import * as CombatStatsTracker from "./CombatStatsTracker";
import { reducePoison } from "./PoisonDamageSystem";
import { popText } from "@Systems/Chara/Animations";
import { getCore } from "@Models/Entities/Card";
import { getCharaById } from "@Systems/Chara/Chara";
import { getCurrentScene } from "@Models/State";

const tickInterval: number = 1000;

let regenTimer: Phaser.Time.TimerEvent;

type RegenState = {
	rate: number;
	accumulator: number;
	sourceContributions?: Map<string, number>;
}

const regenStates: Map<string, RegenState> = new Map();

export function initialize(): void {
	regenStates.clear();
	regenTimer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick,
		loop: true,
	});
}

export function applyRegen(targetForce: Force, amount: number, sourceUnitId?: string): void {
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

	const core = getCore(id);
	const coreChara = getCharaById(core.id);

	popText({
		x: coreChara.x,
		y: coreChara.y,
		text: healing.toString(),
		type: "regen"
	})
}

export function clearRegen(forceId: string) {
	regenStates.delete(forceId);
}

export function stop() {
	regenStates.clear();
	regenTimer.destroy();
}
