import { createChara } from "../../Components/MapChara";
import { events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { makeSquadInteractive } from "../../Scenes/Battleground/Map/makeSquadsInteractive";



export function init(scene: BattlegroundScene) {

	listeners([
		[events.DISPATCH_SQUAD, (squadId: string) => {

			const squad = scene.getSquad( squadId)

			const chara = createChara(
				scene,
				squad,
			)

			scene.charas.push(chara)

			makeSquadInteractive(chara, scene)
		}]
	])

}
