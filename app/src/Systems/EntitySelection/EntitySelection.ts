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
      signals.CITY_SELECTED,
      (id: string) => {

        const deselected = id && id !== state.gameData.selectedCity ? state.gameData.selectedCity : null;

        if (deselected)
          emit(signals.CITY_DESELECTED, deselected);

        state.gameData.selectedCity = id;
      },
    ],
    [
      signals.CITY_DESELECTED,
      (id: string) => {
        state.gameData.selectedCity = null;
      },
    ],
    [
      signals.UNIT_DESTROYED,
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
