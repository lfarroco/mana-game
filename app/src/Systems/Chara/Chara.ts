import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { listeners, signals } from "../../Models/Signals";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	shadow: Phaser.GameObjects.Image,
	unit: Unit,
	container: Phaser.GameObjects.Container
}

const spriteSize = 64;
const shadowSize = 74;

export const CHARA_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	unit: Unit,
): Chara {

	const container = scene.add.container(
		unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT
	)

	const sprite = scene
		.add.image(
			0, 0,
			unit.job
		).setName("chara-" + unit.id);// TODO: is this being used?

	sprite.setDisplaySize(spriteSize, spriteSize)

	const shadow = scene.add.image(
		0, 0,
		unit.job
	).setName("shadow-" + unit.id).setTint(0x000000).setAlpha(1).setDisplaySize(shadowSize, shadowSize);
	shadow.visible = false;

	scene.children.moveBelow(shadow, sprite);

	// TODO: move to animation system
	//sprite.play(unit.job + "-idle-down", true);

	container.add([shadow, sprite])

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: unit.job,
		sprite,
		container,
		shadow,
		unit
	}
	listeners([
		[signals.UNIT_SELECTED, (unitId: string) => {

			if (unitId !== chara.id) return;
			shadow.visible = true;
			scene.cameras.main.pan(
				container.x,
				container.y,
				300,
				"Linear",
				true
			)

		}],
		[
			signals.UNIT_DESELECTED, (unitId: string) => {
				if (unitId !== chara.id) return;
				shadow.visible = false;
			}
		]
	])

	return chara
}


