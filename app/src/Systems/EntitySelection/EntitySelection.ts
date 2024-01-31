import { emit, signals, listeners } from "../../Models/Signals";
import { State } from "../../Models/State";

export function init(state: State) {
  listeners([
    [
      signals.UNITS_SELECTED,
      (ids: string[]) => {
        const deselectedUnits = state.gameData.selectedUnits.filter(
          (id) => !ids.includes(id)
        );

        state.gameData.selectedUnits = ids;

        if (deselectedUnits.length > 0)
          emit(signals.UNITS_DESELECTED, deselectedUnits);
      },
    ],
    [
      signals.CITIES_SELECTED,
      (ids: string[]) => {

        const deselected = state.gameData.selectedCities.filter(
          (id) => !ids.includes(id)
        );
        state.gameData.selectedCities = ids;
        if (deselected.length > 0)
          emit(signals.CITIES_DESELECTED, deselected);
      },
    ],
    [
      signals.SQUAD_DESTROYED,
      (id: string) => {

        const isSelected = state.gameData.selectedUnits.includes(id);
        if (!isSelected) return;

        emit(signals.UNITS_DESELECTED, [id]);
      },
    ],
    [
      signals.UNITS_DESELECTED,
      (ids: string[]) => {
        state.gameData.selectedUnits = state.gameData.selectedUnits.filter(
          (id) => !ids.includes(id)
        );
      },
    ]
  ]);
}
