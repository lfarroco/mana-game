import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Chara } from "./Chara";

const BOX_WIDTH_RATIO = 0.4;
const BOX_HEIGHT_RATIO = 0.2;
const STAT_BOX_CORNER_RADIUS_RATIO = 0.1;
const STAT_BOX_MARGIN_RATIO = 0.15;

export type StatsDisplay = {
	powerDisplayBg: Graphics;
	powerDisplay: Phaser.GameObjects.Text;
	unit: Unit;
	displayedPower: number;
	powerTween: Phaser.Tweens.Tween | null;
	odometerTween: Phaser.Tweens.Tween | null;
}

const statsDisplayMap = new Map<string, StatsDisplay>();

const POWER_DISPLAY_COLORS = {
	DAMAGE_BG: 0xff0000,
	HEAL_BG: 0x23a423,
	ARMOR_BG: 0xd1d135,
	POISON_BG: 0x9932cc,
	REGEN_BG: 0x337a31,
	DEFAULT_BG: 0x29a1b9ff
} as const;

export function create(unit: Unit, container: Chara) {

	const displayableEffects = ["heal", "damage", "shield", "poison", "regen"];

	const effect = unit.effects.find(effect => displayableEffects.includes(effect.id));

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
		constants.HALF_TILE_HEIGHT - boxHeight + margin,
	];

	const colorMap = {
		damage: POWER_DISPLAY_COLORS.DAMAGE_BG,
		heal: POWER_DISPLAY_COLORS.HEAL_BG,
		shield: POWER_DISPLAY_COLORS.ARMOR_BG,
		poison: POWER_DISPLAY_COLORS.POISON_BG,
		regen: POWER_DISPLAY_COLORS.REGEN_BG,
	}
	const bgColor = effect ? colorMap[effect.id as keyof typeof colorMap] : POWER_DISPLAY_COLORS.DEFAULT_BG;

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

	statsDisplayMap.set(unit.id, {
		unit,
		powerDisplayBg,
		powerDisplay,
		displayedPower,
		powerTween,
		odometerTween,
	});

	updatePowerDisplay(unit.id);
}

export function updatePowerDisplay(id: string) {
	const stats = statsDisplayMap.get(id);
	if (!stats || !stats.powerDisplay || !stats.powerDisplay.active) return;

	stats.displayedPower = Math.floor(stats.unit.power);
	stats.powerDisplay.setText(stats.displayedPower.toString());
}

export function animatePowerChange(id: string, newValue: number) {
	const stats = statsDisplayMap.get(id);
	if (!stats || !stats.powerDisplay || !stats.powerDisplay.active) return;

	const startValue = stats.displayedPower;
	const endValue = Math.floor(newValue);
	if (startValue === endValue) return;

	if (stats.powerTween) stats.powerTween.stop();
	if (stats.odometerTween) stats.odometerTween.stop();

	stats.powerTween = scene.tweens.add({
		targets: stats.powerDisplay,
		scale: 1.3,
		yoyo: true,
		ease: 'Quad.easeOut',
		onStart: () => {
			if (stats.powerDisplay && stats.powerDisplay.active) {
				stats.powerDisplay.setScale(1);
			}
		},
		onComplete: () => {
			if (stats.powerDisplay && stats.powerDisplay.active) {
				stats.powerDisplay.setScale(1);
			}
		}
	});

	const duration = 200;
	let lastValue = startValue;
	stats.odometerTween = scene.tweens.addCounter({
		from: startValue,
		to: endValue,
		duration,
		ease: 'Cubic.easeOut',
		onUpdate: tween => {
			if (!stats.powerDisplay || !stats.powerDisplay.active) return;
			const val = Math.round(tween.getValue());
			if (val !== lastValue) {
				stats.displayedPower = val;
				stats.powerDisplay.setText(val.toString());
				lastValue = val;
			}
		},
		onComplete: () => {
			if (stats.powerDisplay && stats.powerDisplay.active) {
				stats.displayedPower = endValue;
				stats.powerDisplay.setText(endValue.toString());
			}
		}
	});
}
