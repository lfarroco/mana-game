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

			const sprite = scene.children.getByName(`chara-${id}`)

			if (!sprite) throw new Error("sprite not found")

			sprite.destroy()

		}]
	])

}