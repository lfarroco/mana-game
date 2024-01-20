import { emit, events, listeners } from "../../Models/Signals";
import { getState } from "../../Models/State";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	listeners([
		[events.BATTLEGROUND_TICK, () => checkIfAllCastlesAreCaptured(scene)]
	])

}

function checkIfAllCastlesAreCaptured(scene: BattlegroundScene) {

	const castles = getState().gameData.cities.filter(c => c.type === "castle")

	const sameForce = castles.every(c => c.force === castles[0].force)

	if (sameForce) {
		const winner = castles[0].force

		if (!winner) throw new Error("winner is undefined")

		getState().gameData.winner = winner

		emit(events.FORCE_VICTORY, winner)
	}

}