import { getCurrentScene } from "@Models/State";
import { cpuForce, Force, manipulateCoreLife, playerForce, applyDamageToForce } from "@Models/Entities/Force";
import * as Poison from "./PoisonDamageSystem";
import * as Regen from "./RegenSystem";

const tickInterval: number = 1000;
let timer: Phaser.Time.TimerEvent;

export function initialize(): void {
	timer = getCurrentScene().time.addEvent({
		delay: tickInterval,
		callback: tick,
		loop: true,
	});
}

function tick() {
	tickForce(playerForce);
	tickForce(cpuForce);
}

function tickForce(force: Force): void {
	const poisonAmount = Poison.getTickAmount(force.id);
	const regenAmount = Regen.getTickAmount(force.id);

	const netHealing = regenAmount - poisonAmount;

	if (netHealing > 0) {
		manipulateCoreLife(force, netHealing);
	} else if (netHealing < 0) {
		applyDamageToForce(force, Math.abs(netHealing), 0, "poison", false);
	}
}

export function stop(): void {
	if (timer) {
		timer.destroy();
	}
}
