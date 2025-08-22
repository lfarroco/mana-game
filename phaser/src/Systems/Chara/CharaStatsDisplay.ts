import Phaser from "phaser";
import { Unit } from "../../Models/Entities/Unit";
import * as constants from "../../constants/constants";
import { scene } from "../../Scenes/Battleground/BattlegroundScene";

const BOX_WIDTH_RATIO = 0.4;
const BOX_HEIGHT_RATIO = 0.2;
const STAT_BOX_CORNER_RADIUS_RATIO = 0.1;
const STAT_BOX_MARGIN_RATIO = 0.1;

export type StatsDisplay = {
	powerDisplayBg: Phaser.GameObjects.Graphics;
	powerDisplay: Phaser.GameObjects.Text;
	unit: Unit;
	displayedPower: number;
	powerTween: Phaser.Tweens.Tween | null;
	odometerTween: Phaser.Tweens.Tween | null;
}

export const CHARA_STATS_COLORS = {
	DAMAGE_BG: 0xff0000,
	HEAL_BG: 0x23a423,
	ARMOR_BG: 0xd1d135,
	POISON_BG: 0x9932cc,
	REGEN_BG: 0x337a31,
	DEFAULT_BG: 0x000000
} as const;

export function create(unit: Unit, container: Container): StatsDisplay | null {

	const displayableEffects = ["heal", "damage", "shield", "poison", "regen"];

	const effect = unit.effects.find(effect => displayableEffects.includes(effect.id));

	if (!effect) return null;

	const displayedPower = Math.floor(unit.power);

	const powerDisplayBg = scene.add.graphics();

	const powerTween: Phaser.Tweens.Tween | null = null;
	const odometerTween: Phaser.Tweens.Tween | null = null;

	const boxWidth = constants.TILE_WIDTH * BOX_WIDTH_RATIO;
	const boxHeight = constants.TILE_HEIGHT * BOX_HEIGHT_RATIO;
	const cornerRadius = boxWidth * STAT_BOX_CORNER_RADIUS_RATIO;
	const margin = boxWidth * STAT_BOX_MARGIN_RATIO;

	const powerDisplayPosition: [number, number] = [
		-boxWidth / 2,
		constants.HALF_TILE_HEIGHT - boxHeight - margin,
	];

	const colorMap = {
		damage: CHARA_STATS_COLORS.DAMAGE_BG,
		heal: CHARA_STATS_COLORS.HEAL_BG,
		shield: CHARA_STATS_COLORS.ARMOR_BG,
		poison: CHARA_STATS_COLORS.POISON_BG,
		regen: CHARA_STATS_COLORS.REGEN_BG,
	}
	const bgColor = colorMap[effect.id as keyof typeof colorMap];

	powerDisplayBg
		.fillStyle(bgColor, 1)
		.fillRoundedRect(
			powerDisplayPosition[0], powerDisplayPosition[1],
			boxWidth, boxHeight,
			cornerRadius
		);

	const powerDisplay = scene.add.text(
		powerDisplayPosition[0] + boxWidth / 2,
		powerDisplayPosition[1] + boxHeight / 2,
		displayedPower.toString(),
		constants.defaultTextConfig
	).setOrigin(0.5).setAlign('center');

	container.add([powerDisplayBg, powerDisplay]);

	return {
		unit,
		powerDisplayBg,
		powerDisplay,
		displayedPower,
		powerTween,
		odometerTween,
	}
}

export function updatePower(stats: StatsDisplay): void {
	stats.displayedPower = Math.floor(stats.unit.power);
	stats.powerDisplay?.setText(stats.displayedPower.toString());
}

export function animatePowerChange(stats: StatsDisplay, newValue: number) {
	if (!stats.powerDisplay) return;

	const startValue = stats.displayedPower;
	const endValue = Math.floor(newValue);
	if (startValue === endValue) return;

	// Stop any previous tweens
	if (stats.powerTween) stats.powerTween.stop();
	if (stats.odometerTween) stats.odometerTween.stop();

	// Pulse animation (scale up then down)
	stats.powerTween = scene.tweens.add({
		targets: stats.powerDisplay,
		scale: 1.3,
		yoyo: true,
		ease: 'Quad.easeOut',
		onStart: () => {
			stats.powerDisplay.setScale(1);
		},
		onComplete: () => {
			stats.powerDisplay.setScale(1);
		}
	});

	// Odometer animation
	const duration = 200;
	let lastValue = startValue;
	stats.odometerTween = scene.tweens.addCounter({
		from: startValue,
		to: endValue,
		duration,
		ease: 'Cubic.easeOut',
		onUpdate: tween => {
			const val = Math.round(tween.getValue());
			if (val !== lastValue) {
				stats.displayedPower = val;
				stats.powerDisplay.setText(val.toString());
				lastValue = val;
			}
		},
		onComplete: () => {
			stats.displayedPower = endValue;
			stats.powerDisplay.setText(endValue.toString());
		}
	});
}

export function updateUnit(stats: StatsDisplay, newUnit: Unit): void {
	stats.unit = newUnit;
	updatePower(stats);
}


export function setVisible(stats: StatsDisplay, visible: boolean): void {
	stats.powerDisplayBg.setVisible(visible);
	stats.powerDisplay.setVisible(visible);
}
