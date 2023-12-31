import { boardVec } from "../../../Models/Misc";
import { events, listeners } from "../../../Models/Signals";
import { SQUAD_STATUS } from "../../../Models/Squad";
import BattlegroundScene from "../BattlegroundScene";

export function squadDestroyed(scene: BattlegroundScene) {

	listeners([
		[events.SQUAD_DESTROYED, (id: string) => {

			const squad = scene.state.squads.find(sqd => sqd.id === id)
			if (!squad) throw new Error("squad not found")

			squad.status = SQUAD_STATUS.DESTROYED
			squad.position = boardVec(-1, -1)

			const chara = scene.charas.find(chara => chara.id === id)

			if (!chara) throw new Error("chara not found")

			chara.moraleBarBackground?.destroy()
			chara.moraleBar?.destroy()
			chara.staminaBarBackground?.destroy()
			chara.staminaBar?.destroy()

			scene.tweens.add({
				targets: chara.sprite,
				alpha: 0,
				duration: 1000,
				ease: 'Power2',
				onComplete: () => {
					chara.group?.destroy(true, true)
				}
			})
			const emote = scene.add.sprite(
				chara?.sprite?.x || 0,
				chara?.sprite?.y || 0,
				"skull-emote"
			)
				.play("skull-emote")
				.setScale(1);
			scene.time.delayedCall(1000, () => {
				emote.destroy()
			});

		}]
	])

}