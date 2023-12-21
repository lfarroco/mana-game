import Phaser from "phaser";
import { Squad, getMembers } from "../Models/Squad";
import { Unit } from "../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";

export type Chara = {
	id: string;
	force: string;
	job: string;
	body: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
	clickZone: Phaser.GameObjects.Zone;
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null
}

export const CHARA_SCALE_X = 2;

export function createChara(
	scene: BattlegroundScene,
	squad: Squad,
): Chara {

	const [leader] = getMembers(squad)

	if (!leader) throw new Error("No leader in squad")

	const tile = scene.layers?.background.getTileAt(squad.position.x, squad.position.y);
	if (!tile) throw new Error("tile not found")

	const sprite = createSprite(scene, leader, squad);

	const body = scene.physics.add.image(
		tile.getCenterX(), tile.getCenterY(), ""
	)
		.setName(squad.id)
		.setSize(TILE_WIDTH, TILE_HEIGHT)
		.setVisible(false)

	const clickZone = scene.add.zone(
		squad.position.x * TILE_WIDTH,
		squad.position.y * TILE_HEIGHT,
		TILE_WIDTH, TILE_HEIGHT
	)
		.setInteractive();


	const follow = () => {
		sprite.x = body.x;
		sprite.y = body.y;
		clickZone.x = body.x;
		clickZone.y = body.y
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	return {
		id: squad.id,
		force: squad.force,
		job: leader.job,
		// phaser doesn't have a working type of a non-visible body, so we lie here
		//@ts-ignore
		body,
		clickZone,
		sprite,
		emote: null
	}
}

function createSprite(scene: BattlegroundScene, leader: Unit, squad: Squad) {

	const sprite = scene
		.add.sprite(0, 0,
			leader.job
		)
		.setScale(
			CHARA_SCALE_X
		)

	sprite.play(leader.job + "-walk-down", true);
	sprite.setName("chara-" + squad.id);
	return sprite;
}

export function createEmote(chara: Chara, key: string) {
	if (chara.emote) chara.emote.destroy()
	const emote = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(2)
	emote.anims.play(key)
	chara.emote = emote
	return chara
}