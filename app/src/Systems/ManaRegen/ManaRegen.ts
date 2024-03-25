import { emit, signals, listeners } from "../../Models/Signals";
import { UNIT_STATUS_KEYS } from "../../Models/Unit";
import { State } from "../../Models/State";

const MANA_REGEN_RATE = 3;

export function init(state: State) {

	listeners([
		// TODO: have a new event, after move and combat phase to do this
		[signals.BATTLEGROUND_TICK, () => {

			state.gameData.units
				.filter(unit => unit.status.type === UNIT_STATUS_KEYS.IDLE)
				.filter(unit => unit.mana < unit.maxMana)
				.forEach(unit => {
					const newMana = unit.mana + MANA_REGEN_RATE;

					if (newMana >= unit.maxMana) {
						emit(signals.UPDATE_UNIT, unit.id, { mana: unit.maxMana })
					} else {
						emit(signals.UPDATE_UNIT, unit.id, { mana: newMana })
					}
				});

		}]
	])

}
