import Phaser from "phaser";
import { Squad } from "../Models/Squad";
import { Unit } from "../Models/Unit";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../Scenes/Battleground/constants";
import "./portrait.css"
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { events, listeners } from "../Models/Signals";
import { DIRECTIONS, Direction } from "../Models/Direction";

export type Chara = {
	id: string;
	force: string;
	job: string;
	sprite: Phaser.GameObjects.Sprite,
	emote: Phaser.GameObjects.Sprite | null,
	emoteOverlay: Phaser.GameObjects.Sprite | null,
	moraleBar: Phaser.GameObjects.Graphics | null,
	moraleBarBackground: Phaser.GameObjects.Graphics | null,
	staminaBar: Phaser.GameObjects.Graphics | null,
	staminaBarBackground: Phaser.GameObjects.Graphics | null,
	direction: Direction,
	group: Phaser.GameObjects.Group | null
}

export const CHARA_SCALE = 1;
export const EMOTE_SCALE = 1;
export const BAR_WIDTH = TILE_WIDTH;
export const BAR_HEIGHT = 6;
export const BORDER_WIDTH = 1;

export function createChara(
	scene: BattlegroundScene,
	squad: Squad,
): Chara {



	const tile = scene.layers?.background.getTileAt(squad.position.x, squad.position.y);
	if (!tile) throw new Error("tile not found")

	const sprite = createSprite(scene, squad);

	//morale bar
	const moraleBackground = scene.add.graphics();
	moraleBackground.fillStyle(0x000000, 1);
	moraleBackground.fillRect(
		0,
		0,
		BAR_WIDTH,
		BAR_HEIGHT
	);
	const moraleBar = scene.add.graphics();
	moraleBar.fillStyle(0x00ff00, 1);
	moraleBar.fillRect(
		0,
		0,
		BAR_WIDTH - BORDER_WIDTH * 2,
		BAR_HEIGHT - BORDER_WIDTH * 2
	);

	//stamina bar

	const staminaBackground = scene.add.graphics();
	staminaBackground.fillStyle(0x000000, 1);
	staminaBackground.fillRect(
		0,
		0,
		BAR_WIDTH,
		BAR_HEIGHT
	);
	const staminaBar = scene.add.graphics();
	staminaBar.fillStyle(0xffff00, 1);
	staminaBar.fillRect(
		0,
		0,
		BAR_WIDTH - BORDER_WIDTH * 2,
		BAR_HEIGHT - BORDER_WIDTH * 2
	);

	const follow = () => {
		moraleBackground.x = sprite.x - HALF_TILE_WIDTH;
		moraleBackground.y = sprite.y + HALF_TILE_HEIGHT - BAR_HEIGHT * 2;
		moraleBar.x = moraleBackground.x + BORDER_WIDTH;
		moraleBar.y = moraleBackground.y + BORDER_WIDTH
		staminaBackground.x = moraleBackground.x;
		staminaBackground.y = moraleBackground.y + BAR_HEIGHT
		staminaBar.x = moraleBar.x;
		staminaBar.y = moraleBar.y + BAR_HEIGHT
	};

	//make bars follow sprite
	scene.events.on("update", follow);
	//destroy listener on element destroy
	sprite.once("destroy", () => {
		scene.events.off("update", follow);
	});

	// this leaks, as the listener is never removed
	// move this to morale/stamina bar systems
	listeners([
		[events.UPDATE_SQUAD, (id: string, arg: any) => {

			if (id !== squad.id) return

			if (!arg.morale) return

			const { morale } = arg

			moraleBar.clear()
			moraleBar.fillStyle(0x00ff00, 1);
			moraleBar.fillRect(
				0,
				0,
				TILE_WIDTH * morale / 100,
				6
			);

		}],
		[events.UPDATE_SQUAD, (id: string, arg: any) => {

			if (id !== squad.id) return

			if (!arg.stamina) return

			const { stamina } = arg

			staminaBar.clear()
			staminaBar.fillStyle(0xffff00, 1);
			staminaBar.fillRect(
				0,
				0,
				TILE_WIDTH * stamina / 100,
				6
			);
		}],
		[events.SQUAD_DESTROYED, (id: string) => {

			if (id !== squad.id) return

			moraleBar.destroy()
			moraleBackground.destroy()
			staminaBar.destroy()
			staminaBackground.destroy()

		}]
	])

	const group = scene.add.group([sprite, moraleBackground, moraleBar, staminaBackground, staminaBar])

	const chara: Chara = {
		id: squad.id,
		force: squad.force,
		job: squad.job,
		sprite,
		emote: null,
		emoteOverlay: null,
		moraleBar,
		moraleBarBackground: moraleBackground,
		staminaBar,
		staminaBarBackground: staminaBackground,
		direction: DIRECTIONS.down,
		group
	}

	return chara
}

function createSprite(scene: BattlegroundScene, squad: Squad) {

	const sprite = scene
		.add.sprite(

			squad.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
			squad.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
			squad.job
		)

	sprite.play(squad.job + "-walk-down", true);
	sprite.setName("chara-" + squad.id);
	return sprite;
}

export function createEmote(chara: Chara, key: string) {
	removeEmote(chara)
	const emote = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(EMOTE_SCALE)
	emote.anims.play(key)
	chara.emote = emote


	const overlay = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(EMOTE_SCALE)
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

	emote.setVisible(false)
	overlay.setVisible(false)
	chara.group?.add(emote)
	chara.group?.add(overlay)

	return chara
}

export function removeEmote(chara: Chara) {
	if (chara.emote)
		chara.emote.destroy()
	if (chara.emoteOverlay)
		chara.emoteOverlay.destroy()
	return chara
}