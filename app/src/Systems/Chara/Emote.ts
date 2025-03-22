import { Chara } from "./Chara";
import { signals, listeners, emit } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";
import { State } from "../../Models/State";
import { Vec2 } from "../../Models/Geometry";
import * as UnitManager from "../../Scenes/Battleground/Systems/UnitManager";

export const EMOTE_SCALE = 1

type EmoteIndex = {
	[key: string]: Phaser.GameObjects.Sprite
}

export function EmoteSystem_init(state: State, scene: BattlegroundScene) {

	let emoteIndex = {} as EmoteIndex

	// TODO: we can have an emote index - this way we can decouple the emote from the chara

	listeners([
		[signals.CHARA_CREATED, (id: string) => {

			createEmote(emoteIndex, UnitManager.getChara(id))

		}],
		[signals.DISPLAY_EMOTE, (id: string, key: string) => {

			const chara = UnitManager.getChara(id)
			const emote = emoteIndex[chara.id]
			if (!emote) throw new Error(`No emote for ${chara.id}`)
			if (emote.texture.key === key && emote.visible) return
			emote.setTexture(key)
			emote.anims.play(key)
			emote.visible = true

		}],
		[signals.HIDE_EMOTE, (id: string) => {

			hideEmote(emoteIndex, id)

		}],
		[signals.MOVEMENT_FINISHED,
		(id: string, _cell: Vec2) => {
			hideEmote(emoteIndex, id)
		}]

	])
}

// todo: decouple emote from overlay
export function createEmote(index: EmoteIndex, chara: Chara) {

	const { scene } = chara.sprite

	const sprite = scene.add.sprite(
		0, -HALF_TILE_HEIGHT,
		"combat-emote",
	).setScale(EMOTE_SCALE);
	sprite.anims.play("combat-emote");
	index[chara.id] = sprite;
	sprite.visible = false;

	chara.container.add(sprite);

	return chara;
}

export function hideEmote(index: EmoteIndex, id: string) {

	const emote = index[id]

	if (!emote) return

	emote.visible = false
}
