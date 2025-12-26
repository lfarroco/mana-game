import { getCurrentScene, State } from "@Models/State";
import { cpuForce, Force, manipulateCoreLife, playerForce, applyDamageToForce } from "@Models/Entities/Force";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";

const tickInterval: number = 1000;
let timer: Phaser.Time.TimerEvent;

export function initialize(state: State): void {
	timer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick(state),
		loop: true,
	});
}

const tick = (state: State) => () => {
	tickForce(state, playerForce);
	tickForce(state, cpuForce);
}

function tickForce(state: State, force: Force): void {
	const poisonAmount = Poison.getTickAmount(force.id);
	const regenAmount = Regen.getTickAmount(force.id);

	const netHealing = regenAmount - poisonAmount;

	if (netHealing > 0) {
		manipulateCoreLife(state, force, netHealing);
	} else if (netHealing < 0) {
		applyDamageToForce(state, force, Math.abs(netHealing), 0, "poison", false);
	}
}

export function stop(): void {
	if (timer) {
		timer.destroy();
	}
}
