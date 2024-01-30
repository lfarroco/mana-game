import { emit, signals, listeners } from "../../../Models/Signals";
import { UNIT_STATUS } from "../../../Models/Unit";
import { State } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function squadDestroyed(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.SQUAD_DESTROYED, (id: string) => {

			emit(signals.UPDATE_SQUAD, id, { status: UNIT_STATUS.DESTROYED() })

			const chara = scene.getChara(id)

			scene.tweens.add({
				targets: chara.sprite,
				alpha: 0,
				duration: 1000 / state.options.speed,
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

			scene.time.delayedCall(1000 / state.options.speed, () => {
				emote.destroy()
			});

			chara.emote?.setVisible(false)

		}]
	])

}
