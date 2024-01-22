import { createChara } from "../../Components/MapChara";
import { Vec2 } from "../../Models/Geometry";
import { events, listeners } from "../../Models/Signals";
import { makeUnit } from "../../Models/Unit";
import { getScene } from "../../Scenes/Battleground/BattlegroundScene";
import { makeSquadInteractive } from "../../Scenes/Battleground/Map/makeSquadsInteractive";

export function init() {

	listeners([
		// TODO: separate the recruit unit action from the chara creation (rendering)
		[events.RECRUIT_UNIT, (unitId: string, forceId: string, jobId: string, position: Vec2) => {

			const scene = getScene()

			const unit = makeUnit(unitId, forceId, jobId, position)

			const chara = createChara(
				scene,
				unit,
			)

			scene.charas.push(chara)

			makeSquadInteractive(chara, scene)

		}]
	])

}
