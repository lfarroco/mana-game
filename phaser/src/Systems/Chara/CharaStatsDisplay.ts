
import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { CHARA_STATS_COLORS } from "../../constants/constants";


export class CharaStatsDisplay {
	scene: Phaser.Scene;
	unit: Unit;

	powerDisplayBg!: Phaser.GameObjects.Graphics;
	powerDisplay!: Phaser.GameObjects.Text;

	// Animation state fields
	private powerTween?: Phaser.Tweens.Tween;
	private odometerTween?: Phaser.Tweens.Tween;
	private displayedPower: number = 0;

	static readonly BOX_WIDTH_RATIO = 0.4;
	static readonly BOX_HEIGHT_RATIO = 0.2;
	static readonly STAT_BOX_CORNER_RADIUS_RATIO = 0.1; // Ratio of boxWidth for corner radius
	static readonly STAT_BOX_MARGIN_RATIO = 0.1; // Ratio of boxWidth for margin

	constructor(scene: Phaser.Scene, unit: Unit) {
		this.scene = scene;
		this.unit = unit;
		this.displayedPower = Math.floor(unit.power);
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
			Math.floor(this.unit.power).toString(),
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
		// For legacy calls, just update instantly
		this.displayedPower = Math.floor(this.unit.power);
		this.powerDisplay.setText(this.displayedPower.toString());
	}

	/**
	 * Animates the power number like an odometer and pulses the text.
	 * If called again during animation, restarts with new value.
	 * @param newValue The new power value to animate to.
	 */
	animatePowerChange(newValue: number) {
		const startValue = this.displayedPower;
		const endValue = Math.floor(newValue);
		if (startValue === endValue) return;

		// Stop any previous tweens
		if (this.powerTween) this.powerTween.stop();
		if (this.odometerTween) this.odometerTween.stop();

		// Pulse animation (scale up then down)
		this.powerTween = this.scene.tweens.add({
			targets: this.powerDisplay,
			scale: 1.3,
			duration: 100,
			yoyo: true,
			ease: 'Quad.easeOut',
			onStart: () => {
				this.powerDisplay.setScale(1);
			},
			onComplete: () => {
				this.powerDisplay.setScale(1);
			}
		});

		// Odometer animation
		const duration = 200;
		let lastValue = startValue;
		this.odometerTween = this.scene.tweens.addCounter({
			from: startValue,
			to: endValue,
			duration,
			ease: 'Cubic.easeOut',
			onUpdate: tween => {
				const val = Math.round(tween.getValue());
				if (val !== lastValue) {
					this.displayedPower = val;
					this.powerDisplay.setText(val.toString());
					lastValue = val;
				}
			},
			onComplete: () => {
				this.displayedPower = endValue;
				this.powerDisplay.setText(endValue.toString());
			}
		});
	}

	updateUnit(newUnit: Unit): void {
		this.unit = newUnit;
		this.updatePower();
	}

	setVisible(visible: boolean): void {
		this.powerDisplayBg.setVisible(visible);
		this.powerDisplay.setVisible(visible && !!this.unit.attackType);
	}
}
