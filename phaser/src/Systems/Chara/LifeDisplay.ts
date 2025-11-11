import Phaser from "phaser";
import { Unit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import { scene } from "@Scenes/Battleground/BattlegroundScene";
import { Chara } from "./Chara";

const BOX_WIDTH_RATIO = 0.4;
const BOX_HEIGHT_RATIO = 0.2;
const STAT_BOX_CORNER_RADIUS_RATIO = 0.1;
const STAT_BOX_MARGIN_RATIO = 0.35;

type StatsDisplay = {
	lifeDisplayBg: Graphics;
	lifeDisplay: Phaser.GameObjects.Text;
	unit: Unit;
}

const statsDisplayMap = new Map<string, StatsDisplay>();

export function create(unit: Unit, container: Chara) {

	const bg = scene.add.graphics();

	const boxWidth = constants.TILE_WIDTH * BOX_WIDTH_RATIO;
	const boxHeight = constants.TILE_HEIGHT * BOX_HEIGHT_RATIO;
	const cornerRadius = boxWidth * STAT_BOX_CORNER_RADIUS_RATIO;
	const margin = boxWidth * STAT_BOX_MARGIN_RATIO;

	const position: [number, number] = [
		-boxWidth / 2,
		constants.HALF_TILE_HEIGHT - boxHeight + margin,
	];

	bg
		.fillStyle(0x33aa33, 1)
		.fillRoundedRect(
			position[0], position[1],
			boxWidth, boxHeight,
			cornerRadius
		);

	const display = scene.add.text(
		position[0] + boxWidth / 2,
		position[1] + boxHeight / 2,
		"0",
		constants.defaultTextConfig
	).setOrigin(0.5).setAlign('center');

	container.add([bg, display]);

	statsDisplayMap.set(unit.id, {
		unit,
		lifeDisplayBg: bg,
		lifeDisplay: display,
	});

	container.on(Phaser.GameObjects.Events.DESTROY, () => {
		statsDisplayMap.delete(unit.id)
	});

	updateLifeDisplay(unit.id);
}

export function updateLifeDisplay(id: string) {
	const stats = statsDisplayMap.get(id)!;

	stats.lifeDisplay.setText(stats.unit.life.toString());
}
