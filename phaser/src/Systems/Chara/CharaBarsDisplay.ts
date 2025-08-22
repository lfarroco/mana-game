import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { getOption } from "../../Models/OptionsStore";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";

export type CharaBars = {
	chargeBar: Phaser.GameObjects.Graphics;
	cooldownBar: Phaser.GameObjects.Graphics;
	unit: Unit;
};

export function create(unit: Unit, container: Container): CharaBars {
	const chargeBar = scene.add.graphics();
	const cooldownBar = scene.add.graphics();

	container.add([chargeBar, cooldownBar]);

	return {
		chargeBar,
		cooldownBar,
		unit
	}
}

export function updateBars({ chargeBar, unit }: CharaBars): void {

	chargeBar.clear();
	const percent = Math.max(0, Math.min(unit.charge / unit.cooldown, 1));
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

export function updateUnit(charaBars: CharaBars, newUnit: Unit): void {
	charaBars.unit = newUnit;
	updateBars(charaBars);
}

export function setVisible(charaBars: CharaBars, visible: boolean): void {
	charaBars.chargeBar.setVisible(visible);
	const debugMode = getOption('debug');
	charaBars.cooldownBar.setVisible(visible && debugMode);
}

