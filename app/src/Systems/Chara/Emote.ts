import { Chara } from "./Chara";
import { signals, listeners, emit } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";
import { State, getUnit } from "../../Models/State";
import { isAttacking } from "../../Models/Unit";
import { getDirection } from "../../Models/Direction";


export const EMOTE_SCALE = 1

type EmoteIndex = {
	[key: string]: Phaser.GameObjects.Sprite
}

export function EmoteSystem_init(state: State, scene: BattlegroundScene) {

	let emoteIndex = {} as EmoteIndex

	// TODO: we can have an emote index - this way we can decouple the emote from the chara

	listeners([
		[signals.CHARA_CREATED, (id: string) => {

			createEmote(emoteIndex, scene.getChara(id))

		}],
		[signals.DISPLAY_EMOTE, (id: string, key: string) => {

			const chara = scene.getChara(id)
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
		[signals.BATTLEGROUND_STARTED, () => {
			scene.charas.forEach(chara => {
				const unit = getUnit(state)(chara.id)
				if (isAttacking(unit.status)) {
					const target = getUnit(state)(unit.status.target)
					const direction = getDirection(unit.position, target.position)
					emit(signals.FACE_DIRECTION, chara.id, direction)
					emit(signals.DISPLAY_EMOTE, chara.id, "combat-emote")
				}
			})
		}],
		[signals.ATTACK_STARTED, (attacker: string, target: string) => {
			emit(signals.DISPLAY_EMOTE, attacker, "combat-emote")
		}],
		[signals.COMBAT_FINISHED, (id: string) => {
			emit(signals.HIDE_EMOTE, id)
		}]

	])
}

// todo: decouple emote from overlay
export function createEmote(index: EmoteIndex, chara: Chara) {

	const sprite = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y,
		"combat-emote",
	).setScale(EMOTE_SCALE);
	sprite.anims.play("combat-emote");
	index[chara.id] = sprite;
	sprite.visible = false;

	const follow = () => {
		sprite.x = chara.sprite.x;
		sprite.y = chara.sprite.y - HALF_TILE_HEIGHT / 2;
	}
	chara.sprite.scene.events.on("update", follow);
	chara.sprite.once("destroy", () => {
		chara.sprite.scene.events.off("update", follow);
	});

	chara.group?.add(sprite);

	return chara;
}

export function hideEmote(index: EmoteIndex, id: string) {

	const emote = index[id]

	if (!emote) return

	emote.visible = false
}
