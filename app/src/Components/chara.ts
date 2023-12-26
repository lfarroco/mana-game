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
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null,
	emoteOverlay: Phaser.GameObjects.Sprite | null,
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

	//morale bar
	const morale = scene.add.graphics();
	morale.fillStyle(0x00ff00, 1);
	morale.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);

	//stamina bar
	const stamina = scene.add.graphics();
	stamina.fillStyle(0xffff00, 1);
	stamina.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);

	const follow = () => {
		morale.x = sprite.x - HALF_TILE_WIDTH
		morale.y = sprite.y + HALF_TILE_HEIGHT + 6
		stamina.x = sprite.x - HALF_TILE_WIDTH
		stamina.y = sprite.y + HALF_TILE_HEIGHT
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	const chara = {
		id: squad.id,
		force: squad.force,
		job: leader.job,
		// phaser doesn't have a working type of a non-visible body, so we lie here
		sprite,
		emote: null,
		emoteOverlay: null
	}

	return chara
}

function createSprite(scene: BattlegroundScene, leader: Unit, squad: Squad) {

	const sprite = scene
		.add.sprite(

			squad.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
			squad.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
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
	removeEmote(chara)
	const emote = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(2)
	emote.anims.play(key)
	chara.emote = emote


	const overlay = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(2)
	overlay.anims.play(key)
	overlay.setCrop(0, 0, 0, 0)
	overlay.setTint(0x00ff00)
	chara.emoteOverlay = overlay
	// follow chara
	chara.sprite.scene.events.on("update", () => {
		emote.x = chara.sprite.x
		emote.y = chara.sprite.y - HALF_TILE_HEIGHT
		overlay.x = chara.sprite.x
		overlay.y = chara.sprite.y - HALF_TILE_HEIGHT
	})

	return chara
}

export function removeEmote(chara: Chara) {
	if (chara.emote) chara.emote.destroy()
	chara.emote = null
	if (chara.emoteOverlay) chara.emoteOverlay.destroy()
	chara.emoteOverlay = null
	return chara
}