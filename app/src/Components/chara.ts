import Phaser from "phaser";
import { Squad, getMembers } from "../Models/Squad";
import { Unit } from "../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { events, listeners } from "../Models/Signals";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null,
	emoteOverlay: Phaser.GameObjects.Sprite | null,
	moraleBar: Phaser.GameObjects.Graphics | null,
	staminaBar: Phaser.GameObjects.Graphics | null,
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
	const moraleBackground = scene.add.graphics();
	moraleBackground.fillStyle(0x000000, 1);
	moraleBackground.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);
	const moraleBar = scene.add.graphics();
	moraleBar.fillStyle(0x00ff00, 1);
	moraleBar.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);

	//stamina bar

	const staminaBackground = scene.add.graphics();
	staminaBackground.fillStyle(0x000000, 1);
	staminaBackground.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);
	const staminaBar = scene.add.graphics();
	staminaBar.fillStyle(0xffff00, 1);
	staminaBar.fillRect(
		0,
		0,
		TILE_WIDTH,
		6
	);

	const follow = () => {
		moraleBar.x = sprite.x - HALF_TILE_WIDTH
		moraleBar.y = sprite.y + HALF_TILE_HEIGHT + 6
		moraleBackground.x = sprite.x - HALF_TILE_WIDTH
		moraleBackground.y = sprite.y + HALF_TILE_HEIGHT + 6
		staminaBar.x = sprite.x - HALF_TILE_WIDTH
		staminaBar.y = sprite.y + HALF_TILE_HEIGHT
		staminaBackground.x = sprite.x - HALF_TILE_WIDTH
		staminaBackground.y = sprite.y + HALF_TILE_HEIGHT
	};

	//todo: iterate on scene state, for each chara, make it follow its circle

	//make spineboy follow circle
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	listeners([
		[events.UPDATE_SQUAD_MORALE, (id: string, morale: number) => {

			if (id !== squad.id) return

			moraleBar.clear()
			moraleBar.fillStyle(0x00ff00, 1);
			moraleBar.fillRect(
				0,
				0,
				TILE_WIDTH * morale / 100,
				6
			);

		}],
		[events.UPDATE_SQUAD_STAMINA, (id: string, stamina: number) => {

			if (id !== squad.id) return

			staminaBar.clear()
			staminaBar.fillStyle(0xffff00, 1);
			staminaBar.fillRect(
				0,
				0,
				TILE_WIDTH * stamina / 100,
				6
			);

		}]
	])

	const chara = {
		id: squad.id,
		force: squad.force,
		job: leader.job,
		// phaser doesn't have a working type of a non-visible body, so we lie here
		sprite,
		emote: null,
		emoteOverlay: null,
		moraleBar,
		staminaBar
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