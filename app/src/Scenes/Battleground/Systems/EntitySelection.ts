import { emit, events, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";

export function init(state: State) {

  listeners([
    [
      events.UNITS_SELECTED,
      (ids: string[]) => {

        const deselectedUnits = state.gameData.selectedUnits.filter((id) => !ids.includes(id));
        if (deselectedUnits.length > 0) emit(events.UNITS_DESELECTED, deselectedUnits);

        state.gameData.selectedUnits = ids;
      },
    ],
    [
      events.CITIES_SELECTED,
      (ids: string[]) => {
        state.gameData.selectedCities = ids;
      },
    ]
  ]);
}

