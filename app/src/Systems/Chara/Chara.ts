import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	group: Phaser.GameObjects.Group | null,
	unit: Unit,
}

export const CHARA_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	unit: Unit,
): Chara {

	const sprite = scene
		.add.image(
			unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
			unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
			unit.job
		).setName("chara-" + unit.id);// TODO: is this being used?

	sprite.setDisplaySize(64, 64)

	// TODO: move to animation system
	//sprite.play(unit.job + "-idle-down", true);

	const group = scene.add.group([sprite]) // TODO: is this being used?

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: unit.job,
		sprite,
		group,
		unit
	}

	return chara
}
