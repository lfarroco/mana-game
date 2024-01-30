import { emit, signals, listeners } from "../../Models/Signals";
import { State } from "../../Models/State";

export function init(state: State) {

	listeners([
		[signals.BATTLEGROUND_TICK, () => checkIfAllCastlesAreCaptured(state)]
	])

}

function checkIfAllCastlesAreCaptured(state: State) {

	const castles = state.gameData.cities.filter(c => c.type === "castle")

	const sameForce = castles.every(c => c.force === castles[0].force)

	if (sameForce) {
		const winner = castles[0].force

		if (!winner) throw new Error("winner is undefined")

		state.gameData.winner = winner

		emit(signals.FORCE_VICTORY, winner)
	}

}