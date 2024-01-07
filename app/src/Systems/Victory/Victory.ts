import { emit, events, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {

	listeners([
		[events.BATTLEGROUND_TICK, () => checkIfAllCastlesAreCaptured(scene)]
	])

}

function checkIfAllCastlesAreCaptured(scene: BattlegroundScene) {

	const castles = scene.state.cities.filter(c => c.type === "castle")

	const sameForce = castles.every(c => c.force === castles[0].force)

	if (sameForce) {
		const winner = castles[0].force

		scene.state.winner = winner

		emit(events.FORCE_VICTORY, winner)
	}

}