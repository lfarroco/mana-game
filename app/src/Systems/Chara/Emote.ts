import { Chara, EMOTE_SCALE } from "../../Components/MapChara";
import { events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";


export function init(scene: BattlegroundScene) {

	listeners([
		[events.CREATE_EMOTE, (id: string, key: string) => {

			const chara = scene.charas.find(c => c.id === id)
			if (!chara) throw new Error("chara not found")

			createEmote(chara, key)

		}],
		[events.REMOVE_EMOTE, (id: string) => {

			const chara = scene.charas.find(c => c.id === id)
			if (!chara) throw new Error("chara not found")

			removeEmote(chara)

		}],
	])

}

// todo: decouple emote from overlay
export function createEmote(chara: Chara, key: string) {
	removeEmote(chara);
	const emote = chara.sprite.scene.add.sprite(
		chara.sprite.x,
		chara.sprite.y - HALF_TILE_HEIGHT,
		key).setScale(EMOTE_SCALE);
	emote.anims.play(key);
	chara.emote = emote;

	const follow = () => {
		emote.x = chara.sprite.x;
		emote.y = chara.sprite.y - HALF_TILE_HEIGHT;
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
