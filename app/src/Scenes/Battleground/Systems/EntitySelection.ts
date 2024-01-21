import { events, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";

export function init(state: State) {

  listeners([
    [
      events.UNITS_SELECTED,
      (ids: string[]) => {
        state.gameData.selectedUnits = ids;
      },
    ],
    [
      events.CITIES_SELECTED,
      (ids: string[]) => {
        state.gameData.selectedCities = ids;
      },
    ],
  ]);
}

