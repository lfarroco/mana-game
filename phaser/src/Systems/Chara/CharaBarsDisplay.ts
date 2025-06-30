// src/Systems/Chara/CharaBarsDisplay.ts
import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { getOption } from "../../Models/OptionsStore";
import { hasStatusEffect } from "../../Systems/StatusEffects/StatusEffectManager";

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
		const { chargeBar, cooldownBar, hpBar, unit } = this;
		const maxWidthForDebugBars = constants.TILE_WIDTH - (2 * CharaBarsDisplay.DEBUG_BAR_PADDING);

		// Charge Bar
		chargeBar.clear();
		const percent = unit.charge / unit.cooldown;
		let color = 0x000;

		// Check status effects using the new system
		const isHasted = hasStatusEffect(unit, 'haste');
		const isSlowed = hasStatusEffect(unit, 'slow');
		const isFrozen = hasStatusEffect(unit, 'freeze') || hasStatusEffect(unit, 'stun');

		if (isFrozen) color = 0x87ceeb; // Light blue for frozen/stunned
		else if (isHasted && isSlowed) color = 0x000;
		else if (isHasted) color = 0x00ff00;
		else if (isSlowed) color = 0xff0000;

		chargeBar.fillStyle(color, 0.2);
		chargeBar.fillRect(
			-constants.HALF_TILE_WIDTH,
			-constants.HALF_TILE_HEIGHT,
			constants.TILE_WIDTH,
			constants.TILE_HEIGHT - Math.min(percent * constants.TILE_HEIGHT, constants.TILE_HEIGHT)
		);

		if (!getOption('debug')) {
			cooldownBar.clear();
			hpBar.clear();
			return;
		}

		// Cooldown Bar (Debug)
		cooldownBar.clear();
		const cooldownPercent = Math.min(unit.refresh / constants.MIN_COOLDOWN, 1);
		cooldownBar.fillStyle(0xff0000, 1);
		cooldownBar.fillRect(
			-constants.HALF_TILE_WIDTH + CharaBarsDisplay.DEBUG_BAR_PADDING,
			-constants.HALF_TILE_HEIGHT + 30,
			cooldownPercent * maxWidthForDebugBars,
			CharaBarsDisplay.DEBUG_BAR_HEIGHT
		);

		// HP Bar (Debug)
		hpBar.clear();
		const hpPercent = Math.min(unit.hp / unit.maxHp, 1);
		hpBar.fillStyle(0x00ff00, 1);
		hpBar.fillRect(
			-constants.HALF_TILE_WIDTH + CharaBarsDisplay.DEBUG_BAR_PADDING,
			-constants.HALF_TILE_HEIGHT + 50,
			hpPercent * maxWidthForDebugBars,
			CharaBarsDisplay.DEBUG_BAR_HEIGHT
		);
	}

	setVisible(visible: boolean): void {
		this.chargeBar.setVisible(visible);
		const debugMode = getOption('debug');
		this.cooldownBar.setVisible(visible && debugMode);
		this.hpBar.setVisible(visible && debugMode);
	}
}
