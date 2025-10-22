import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";

export type CharaBars = {
	chargeBar: Graphics;
	unit: Unit;
};

let charaBarsMap = new Map<string, CharaBars>();

export function create(unit: Unit, container: Container) {
	const chargeBar = scene.add.graphics();

	container.add([chargeBar]);

	const state = {
		chargeBar,
		unit
	}

	charaBarsMap.set(unit.id, state);
}

export function clearAll(): void {
	charaBarsMap.forEach(state => {
		state.chargeBar.destroy();
	});
	charaBarsMap.clear();
}

export function updateChargeBar(id: string): void {

	const state = charaBarsMap.get(id);
	if (!state) return;

	const { chargeBar, unit } = state;

	chargeBar.clear();

	const percent = Math.max(
		0,
		Math.min(unit.charge / unit.cooldown, 1)
	);

	let color = 0x33ff33;

	const isHasted = unit.hasted > 0;
	const isSlowed = unit.slowed > 0;
	const isNormal = (!isHasted && !isSlowed) || (isHasted && isSlowed);

	if (isHasted && !isNormal) color = 0x00eaff;
	if (isSlowed && !isNormal) color = 0xff0000;
	if (isNormal) color = 0x33ff33;

	const centerX = 0;
	const centerY = 0;

	const borderRadius = (constants.TILE_WIDTH * 0.8) / 2;
	const arcRadius = borderRadius;
	const lineWidth = 10;
	const startAngle = Phaser.Math.DegToRad(-90);
	const endAngle = startAngle + Phaser.Math.DegToRad(360 * percent);
	chargeBar.lineStyle(lineWidth, color, 0.8);

	if (percent > 0) {
		chargeBar.beginPath();
		chargeBar.arc(centerX, centerY, arcRadius, startAngle, endAngle, false);
		chargeBar.strokePath();
	}
}