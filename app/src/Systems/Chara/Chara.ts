import Phaser from "phaser";
import { Unit } from "../../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null,
	group: Phaser.GameObjects.Group | null,
}

export const CHARA_SCALE = 1;
export const EMOTE_SCALE = 1;

export function createChara(
	scene: BattlegroundScene,
	squad: Unit,
): Chara {

	const sprite = scene
		.add.sprite(
			squad.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
			squad.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
			squad.job
		).setName("chara-" + squad.id);// TODO: is this being used?

	// TODO: move to animation system
	sprite.play(squad.job + "-walk-down", true);

	const group = scene.add.group([sprite]) // TODO: is this being used?

	const chara: Chara = {
		id: squad.id,
		force: squad.force,
		job: squad.job,
		sprite,
		emote: null,
		group,
	}

	return chara
}
