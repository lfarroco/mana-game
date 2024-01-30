import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { signals, listeners } from "../../../Models/Signals";
import { getCity, getState } from "../../../Models/State";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
	listeners([
		[signals.CAPTURE_CITY, (cityId: string, forceId: string) => {

			const state = getState()

			const city = getCity(state)(cityId)

			city.force = forceId;

			const citySprite = scene.getCity(cityId)

			if (forceId === FORCE_ID_PLAYER) {
				citySprite.sprite.setTint(0x00ff00)
			} else {
				citySprite.sprite.setTint(0xff0000)
			}

		}]
	])
}