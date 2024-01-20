import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { events, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
	listeners([
		[events.CAPTURE_CITY, (cityId: string, forceId: string) => {

			const city = scene.state.gameData.cities.find(c => c.id === cityId)
			if (!city) throw new Error("city not found")

			city.force = forceId;

			const citySprite = scene.cities.find(c => c.city.id === cityId)
			if (!citySprite) throw new Error("city sprite not found")

			if (forceId === FORCE_ID_PLAYER) {
				citySprite.sprite.setTint(0x00ff00)
			} else {
				citySprite.sprite.setTint(0xff0000)
			}

		}]
	])
}