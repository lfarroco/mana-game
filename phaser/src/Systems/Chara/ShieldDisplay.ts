import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Chara, getCharaById } from "./Chara";

const BOX_WIDTH_RATIO = 0.4;
const BOX_HEIGHT_RATIO = 0.2;
const STAT_BOX_CORNER_RADIUS_RATIO = 0.1;
const STAT_BOX_MARGIN_RATIO = 0.15;

type StatsDisplay = {
	shieldDisplayBg: Graphics;
	shieldDisplay: Phaser.GameObjects.Text;
	unit: Unit;
	displayedShield: number;
	shieldTween: Phaser.Tweens.Tween | null;
	odometerTween: Phaser.Tweens.Tween | null;
}

const statsDisplayMap = new Map<string, StatsDisplay>();

export function create(unit: Unit, container: Chara) {

	const displayedShield = Math.floor(unit.shield);

	const shieldDisplayBg = scene.add.graphics();

	const shieldTween: Phaser.Tweens.Tween | null = null;
	const odometerTween: Phaser.Tweens.Tween | null = null;

	const boxWidth = constants.TILE_WIDTH * BOX_WIDTH_RATIO;
	const boxHeight = constants.TILE_HEIGHT * BOX_HEIGHT_RATIO;
	const cornerRadius = boxWidth * STAT_BOX_CORNER_RADIUS_RATIO;
	const margin = boxWidth * STAT_BOX_MARGIN_RATIO;

	const shieldDisplayPosition: [number, number] = [
		-boxWidth / 2,
		constants.HALF_TILE_HEIGHT - boxHeight + margin - 50,
	];

	shieldDisplayBg
		.fillStyle(0xffff00, 1)
		.fillRoundedRect(
			shieldDisplayPosition[0], shieldDisplayPosition[1],
			boxWidth, boxHeight,
			cornerRadius
		);

	const shieldDisplay = scene.add.text(
		shieldDisplayPosition[0] + boxWidth / 2,
		shieldDisplayPosition[1] + boxHeight / 2,
		displayedShield.toString(),
		constants.defaultTextConfig
	).setOrigin(0.5).setAlign('center');

	container.add([shieldDisplayBg, shieldDisplay]);

	statsDisplayMap.set(unit.id, {
		unit,
		shieldDisplayBg,
		shieldDisplay,
		displayedShield,
		shieldTween,
		odometerTween,
	});

	updateShieldDisplay(unit.id);
}

export function updateShieldDisplay(id: string) {
	let stats = statsDisplayMap.get(id);
	if (!stats) {
		const chara = getCharaById(id);
		create(state.battleData.units.find(u => u.id === id)! as Unit, getCharaById(id));
		chara.on(Phaser.GameObjects.Events.DESTROY, () => {
			statsDisplayMap.delete(id)
		});
		return;
	};

	stats.displayedShield = Math.floor(stats.unit.shield);
	stats.shieldDisplay.setText(stats.displayedShield.toString());
}
