import { emit, events, listeners } from "../../../Models/Signals";
import { SQUAD_STATUS } from "../../../Models/Squad";
import BattlegroundScene from "../BattlegroundScene";

export function squadDestroyed(scene: BattlegroundScene) {

	listeners([
		[events.SQUAD_DESTROYED, (id: string) => {

			const squad = scene.state.squads.find(sqd => sqd.id === id)
			if (!squad) throw new Error("squad not found")

			emit(events.UPDATE_SQUAD, id, { status: SQUAD_STATUS.DESTROYED })

			const chara = scene.charas.find(chara => chara.id === id)

			if (!chara) throw new Error("chara not found")

			scene.tweens.add({
				targets: chara.sprite,
				alpha: 0,
				duration: 1000 / scene.state.speed,
				ease: 'Power2',
				onComplete: () => {
					chara.group?.destroy(true, true)
				}
			});

			const emote = scene.add.sprite(
				chara?.sprite?.x || 0,
				chara?.sprite?.y || 0,
				"skull-emote"
			)
				.play("skull-emote")
				.setScale(1);

			scene.time.delayedCall(1000 / scene.state.speed, () => {
				emote.destroy()
			});

			chara.emote?.setVisible(false)

		}]
	])

}