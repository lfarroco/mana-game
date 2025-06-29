// src/Systems/Chara/CharaStatsDisplay.ts
import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as bgConstants from "../../constants/constants";

export class CharaStatsDisplay {
	scene: Phaser.Scene;
	unit: Unit;

	atkBg!: Phaser.GameObjects.Graphics;
	atkDisplay!: Phaser.GameObjects.Text;

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
		const boxWidth = bgConstants.TILE_WIDTH * CharaStatsDisplay.BOX_WIDTH_RATIO;
		const boxHeight = bgConstants.TILE_HEIGHT * CharaStatsDisplay.BOX_HEIGHT_RATIO;
		const cornerRadius = boxWidth * CharaStatsDisplay.STAT_BOX_CORNER_RADIUS_RATIO;
		const margin = boxWidth * CharaStatsDisplay.STAT_BOX_MARGIN_RATIO;

		// ATK Display
		const atkPosition: [number, number] = [
			-boxWidth / 2,
			bgConstants.HALF_TILE_HEIGHT - boxHeight - margin,
		];
		this.atkBg = this.scene.add.graphics();
		this.atkBg
			.fillStyle(0xff0000, 1)
			.fillRoundedRect(
				atkPosition[0], atkPosition[1],
				boxWidth, boxHeight,
				cornerRadius
			);

		this.atkDisplay = this.scene.add.text(
			atkPosition[0] + boxWidth / 2,
			atkPosition[1] + boxHeight / 2,
			this.unit.power.toString(),
			bgConstants.defaultTextConfig
		).setOrigin(0.5).setAlign('center');

		if (this.unit.attackType === "none") {
			this.atkDisplay.setAlpha(0);
			this.atkBg.setAlpha(0);
		}
	}

	addToContainer(container: Phaser.GameObjects.Container): void {
		container.add([this.atkBg, this.atkDisplay]);
	}

	updateAtk(): void {
		this.atkDisplay.setText(Math.floor(this.unit.power).toString());
	}

	setVisible(visible: boolean): void {
		this.atkBg.setVisible(visible);
		this.atkDisplay.setVisible(visible && this.unit.attackType !== "none");
	}
}
