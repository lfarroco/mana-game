import { signals, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function unitDestroyed(scene: BattlegroundScene, state: State) {

	listeners([
		[signals.UNIT_DESTROYED, (id: string) => {

			const chara = scene.getChara(id)

			scene.tweens.add({
				targets: chara.container,
				alpha: 0,
				duration: 1000 / state.options.speed,
				ease: 'Power2',
				onComplete: () => {
					chara.container.destroy(true)
				}
			});

		}]
	])

}
