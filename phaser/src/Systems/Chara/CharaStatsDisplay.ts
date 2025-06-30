// src/Systems/Chara/CharaStatsDisplay.ts
import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { CHARA_STATS_COLORS } from "../../constants/constants";

export class CharaStatsDisplay {
	scene: Phaser.Scene;
	unit: Unit;

	powerDisplayBg!: Phaser.GameObjects.Graphics;
	powerDisplay!: Phaser.GameObjects.Text;

	static readonly BOX_WIDTH_RATIO = 0.4;
	static readonly BOX_HEIGHT_RATIO = 0.2;
	static readonly STAT_BOX_CORNER_RADIUS_RATIO = 0.1; // Ratio of boxWidth for corner radius
	static readonly STAT_BOX_MARGIN_RATIO = 0.1; // Ratio of boxWidth for margin

	constructor(scene: Phaser.Scene, unit: Unit) {
		this.scene = scene;
		this.unit = unit;
		this.createElements();
	}

	createElements(): void {
		const boxWidth = constants.TILE_WIDTH * CharaStatsDisplay.BOX_WIDTH_RATIO;
		const boxHeight = constants.TILE_HEIGHT * CharaStatsDisplay.BOX_HEIGHT_RATIO;
		const cornerRadius = boxWidth * CharaStatsDisplay.STAT_BOX_CORNER_RADIUS_RATIO;
		const margin = boxWidth * CharaStatsDisplay.STAT_BOX_MARGIN_RATIO;

		// Power Display
		const powerDisplayPosition: [number, number] = [
			-boxWidth / 2,
			constants.HALF_TILE_HEIGHT - boxHeight - margin,
		];
		this.powerDisplayBg = this.scene.add.graphics();
		const bgColorMap = {
			damage: CHARA_STATS_COLORS.DAMAGE_BG,
			heal: CHARA_STATS_COLORS.HEAL_BG,
			armor: CHARA_STATS_COLORS.ARMOR_BG,
		}
		const bgColor = !this.unit.attackType ? CHARA_STATS_COLORS.DEFAULT_BG : bgColorMap[this.unit.attackType];
		this.powerDisplayBg
			.fillStyle(bgColor, 1)
			.fillRoundedRect(
				powerDisplayPosition[0], powerDisplayPosition[1],
				boxWidth, boxHeight,
				cornerRadius
			);

		this.powerDisplay = this.scene.add.text(
			powerDisplayPosition[0] + boxWidth / 2,
			powerDisplayPosition[1] + boxHeight / 2,
			this.unit.power.toString(),
			constants.defaultTextConfig
		).setOrigin(0.5).setAlign('center');

		if (!this.unit.attackType) {
			this.powerDisplay.setAlpha(0);
			this.powerDisplayBg.setAlpha(0);
		}
	}

	addToContainer(container: Phaser.GameObjects.Container): void {
		container.add([this.powerDisplayBg, this.powerDisplay]);
	}

	updatePower(): void {
		this.powerDisplay.setText(Math.floor(this.unit.power).toString());
	}

	setVisible(visible: boolean): void {
		this.powerDisplayBg.setVisible(visible);
		this.powerDisplay.setVisible(visible && !!this.unit.attackType);
	}
}
