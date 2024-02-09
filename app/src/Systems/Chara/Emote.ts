import { Chara, EMOTE_SCALE } from "./Chara";
import { signals, listeners, emit } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";
import { State, getSquad } from "../../Models/State";
import { isAttacking } from "../../Models/Unit";
import { getDirection } from "../../Models/Direction";

export function EmoteSystem_init(state: State, scene: BattlegroundScene) {

	// TODO: we can have an emote index - this way we can decouple the emote from the chara

	listeners([
		[signals.CREATE_EMOTE, (id: string, key: string) => {

			const chara = scene.getChara(id)

			createEmote(chara, key)

		}],
		[signals.REMOVE_EMOTE, (id: string) => {

			const chara = scene.getChara(id)

			removeEmote(chara)

		}],
		[signals.BATTLEGROUND_STARTED, () => {
			scene.charas.forEach(chara => {
				const unit = getSquad(state)(chara.id)
				if (isAttacking(unit.status)) {
					const target = getSquad(state)(unit.status.target)
					const direction = getDirection(unit.position, target.position)
					emit(signals.FACE_DIRECTION, chara.id, direction)
					emit(signals.CREATE_EMOTE, chara.id, "combat-emote")
				}
			})
		}]
	])
}

// todo: decouple emote from overlay
export function createEmote(chara: Chara, key: string) {

	if (chara.emote && chara.emote.name === key) return chara;

	removeEmote(chara);
	const emote = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y,
		key).setScale(EMOTE_SCALE);
	emote.setName(key)
	emote.anims.play(key);
	chara.emote = emote;

	const follow = () => {
		emote.x = chara.sprite.x;
		emote.y = chara.sprite.y - HALF_TILE_HEIGHT / 2;
	}
	chara.sprite.scene.events.on("update", follow);
	chara.sprite.once("destroy", () => {
		chara.sprite.scene.events.off("update", follow);
	});

	chara.group?.add(emote);

	return chara;
}

export function removeEmote(chara: Chara) {
	if (chara.emote)
		chara.emote.destroy();
	return chara;
}
