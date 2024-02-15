
import { signals, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function BattlegroundAudioSystem_init(state: State, scene: BattlegroundScene) {

	let tracks: { [key: string]: Phaser.Time.TimerEvent } = {}
	listeners([
		[signals.SELECT_UNIT_MOVE_DONE, () => {

			scene.sound.play('audio/march')

		}],
		[signals.ATTACK_STARTED, (attacker: string) => {

			const random = () => Math.floor(Math.random() * 3) + 1
			scene.sound.play('audio/sword' + random())
			const ev = scene.time.addEvent({
				delay: 500,
				callback: () => {
					scene.sound.play('audio/sword' + random())
				},
				loop: true

			})
			tracks[attacker] = ev
		}],
		[signals.COMBAT_FINISHED, (attacker: string) => {
			tracks[attacker].destroy()
			delete tracks[attacker]
		}],
	])
}