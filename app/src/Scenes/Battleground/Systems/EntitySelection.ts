import { emit, signals, listeners } from "../../../Models/Signals";
import { State } from "../../../Models/State";

export function init(state: State) {
  listeners([
    [
      signals.UNITS_SELECTED,
      (ids: string[]) => {
        const deselectedUnits = state.gameData.selectedUnits.filter(
          (id) => !ids.includes(id)
        );
        if (deselectedUnits.length > 0)
          emit(signals.UNITS_DESELECTED, deselectedUnits);

        state.gameData.selectedUnits = ids;
      },
    ],
    [
      signals.CITIES_SELECTED,
      (ids: string[]) => {
        state.gameData.selectedCities = ids;
      },
    ],
    [
      signals.UNITS_DESELECTED,
      (ids: string[]) => {
        state.gameData.selectedUnits = state.gameData.selectedUnits.filter(
          (id) => !ids.includes(id)
        );
      },
    ],
    [
      signals.SQUAD_DESTROYED,
      (id: string) => {
        emit(signals.UNITS_DESELECTED, [id]);
      },
    ],
  ]);
}
