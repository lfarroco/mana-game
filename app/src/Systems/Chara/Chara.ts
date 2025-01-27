import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { listeners, signals } from "../../Models/Signals";
import { tween } from "../../Utils/animation";
import { FORCE_ID_PLAYER } from "../../Models/Force";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Image,
	group: Phaser.GameObjects.Group | null,
	shadow: Phaser.GameObjects.Image,
	unit: Unit,
}

const spriteSize = 64;
const shadowSize = 74;

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

	sprite.setDisplaySize(spriteSize, spriteSize)

	const shadow = scene.add.image(
		unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
		unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
		unit.job
	).setName("shadow-" + unit.id).setTint(0x000000).setAlpha(1).setDisplaySize(shadowSize, shadowSize);
	shadow.visible = false;

	scene.children.moveBelow(shadow, sprite);

	// TODO: move to animation system
	//sprite.play(unit.job + "-idle-down", true);

	const group = scene.add.group([sprite, shadow]) // TODO: is this being used?

	const chara: Chara = {
		id: unit.id,
		force: unit.force,
		job: unit.job,
		sprite,
		group,
		shadow,
		unit
	}
	listeners([
		[signals.UNIT_SELECTED, (unitId: string) => {

			if (unitId !== chara.id) return;
			shadow.visible = true;
			scene.cameras.main.pan(
				sprite.x,
				sprite.y,
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


