// src/Systems/Chara/CharaBarsDisplay.ts
import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { getOption } from "../../Models/OptionsStore";

export class CharaBarsDisplay {
	scene: Phaser.Scene;
	unit: Unit;

	chargeBar!: Phaser.GameObjects.Graphics;
	cooldownBar!: Phaser.GameObjects.Graphics;
	hpBar!: Phaser.GameObjects.Graphics;

	static readonly DEBUG_BAR_PADDING = 10;
	static readonly DEBUG_BAR_HEIGHT = 10;

	constructor(scene: Phaser.Scene, unit: Unit) {
		this.scene = scene;
		this.unit = unit;
		this.createElements();
	}

	createElements(): void {
		this.chargeBar = this.scene.add.graphics();
		this.cooldownBar = this.scene.add.graphics();
		this.hpBar = this.scene.add.graphics();
	}

	addToContainer(container: Phaser.GameObjects.Container): void {
		container.add([this.chargeBar, this.cooldownBar, this.hpBar]);
	}

	updateBars(): void {
		const { chargeBar, unit } = this;

		// Charge Bar as a circular arc
		chargeBar.clear();
		const percent = Math.max(0, Math.min(unit.charge / unit.cooldown, 1));
		let color = 0x33ff33;

		// Check status effects using the new system
		const isHasted = unit.hasted > 0;
		const isSlowed = unit.slowed > 0;
		const isNormal = (!isHasted && !isSlowed) || (isHasted && isSlowed);
		// const isSlowed = hasStatusEffect(unit, 'slow');
		// const isFrozen = hasStatusEffect(unit, 'freeze') || hasStatusEffect(unit, 'stun');

		if (isHasted && !isNormal) color = 0x00eaff;
		if (isSlowed && !isNormal) color = 0xff0000;
		if (isNormal) color = 0x33ff33; // Default green for normal state
		//if (isFrozen) color = 0x87ceeb; // Light blue for frozen/stunned
		//else if (isHasted && isSlowed) color = 0x000000;
		//else if (isSlowed) color = 0xff0000;

		// Draw a circular arc (outline only) exactly over the chara border
		const centerX = 0;
		const centerY = 0;
		// The border in Chara.ts uses: (constants.TILE_WIDTH * 0.8) / 2
		const borderRadius = (constants.TILE_WIDTH * 0.8) / 2;
		const arcRadius = borderRadius; // match border exactly
		const lineWidth = 10; // match border width
		const startAngle = Phaser.Math.DegToRad(-90); // Start at top
		const endAngle = startAngle + Phaser.Math.DegToRad(360 * percent);
		chargeBar.lineStyle(lineWidth, color, 0.8); // match border width (border is 3)
		if (percent > 0) {
			chargeBar.beginPath();
			chargeBar.arc(centerX, centerY, arcRadius, startAngle, endAngle, false);
			chargeBar.strokePath();
		}
	}

	updateUnit(newUnit: Unit): void {
		this.unit = newUnit;
		this.updateBars();
	}

	setVisible(visible: boolean): void {
		this.chargeBar.setVisible(visible);
		const debugMode = getOption('debug');
		this.cooldownBar.setVisible(visible && debugMode);
		this.hpBar.setVisible(false); // HP bar disabled since units no longer have HP
	}
}
