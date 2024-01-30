import { listeners, signals } from "../../Models/Signals"
import { State, getSquad } from "../../Models/State"
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene"
import { TILE_WIDTH } from "../../Scenes/Battleground/constants";

export const CHARA_SCALE = 1;
export const EMOTE_SCALE = 1;
export const BAR_WIDTH = TILE_WIDTH / 2;
export const BAR_HEIGHT = 6;
export const BORDER_WIDTH = 1;

export function init(state: State, scene: BattlegroundScene) {
	listeners([
		[signals.UPDATE_SQUAD, (id: string, arg: any) => {
			const { hp } = arg

			// check if hp is defined (it may be 0)
			if (hp === undefined) return

			const chara = scene.getChara(id)
			const squad = getSquad(state)(id)

			chara.staminaBar?.clear()
			chara.staminaBar?.fillStyle(0xffff00, 1);
			chara.staminaBar?.fillRect(
				0,
				0,
				BAR_WIDTH * hp / squad.maxHp - BORDER_WIDTH * 2,
				BAR_HEIGHT - BORDER_WIDTH * 2
			);
		}],
		[signals.SQUAD_DESTROYED, (id: string) => {

			const chara = scene.getChara(id)

			chara.staminaBar?.destroy()
			chara.staminaBarBackground?.destroy()

		}]
	])

}