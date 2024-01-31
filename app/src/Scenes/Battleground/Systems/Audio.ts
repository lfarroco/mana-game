
import { signals, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function BattlegroundAudioSystem_init(state: State, scene: BattlegroundScene) {
	listeners([
		[signals.SELECT_SQUAD_MOVE_DONE, () => {

			scene.sound.play('audio/march')

		}]
	])
}