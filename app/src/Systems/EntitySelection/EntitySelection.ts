import { emit, signals, listeners } from "../../Models/Signals";
import { State } from "../../Models/State";

export function init(state: State) {
  listeners([
    [
      signals.UNIT_SELECTED,
      (id: string) => {

        const currentSelectedUnit = state.gameData.selectedUnit;

        if (currentSelectedUnit === id) return;

        if (currentSelectedUnit)
          emit(signals.UNIT_DESELECTED, currentSelectedUnit);

        if (state.gameData.selectedCity)
          emit(signals.CITY_DESELECTED, state.gameData.selectedCity);

        state.gameData.selectedUnit = id;

      },
    ],
    [
      signals.CITY_SELECTED,
      (id: string) => {

        const currentSelectedCity = state.gameData.selectedCity;

        if (currentSelectedCity === id) return;

        if (currentSelectedCity)
          emit(signals.CITY_DESELECTED, currentSelectedCity);
        if (state.gameData.selectedUnit)
          emit(signals.UNIT_DESELECTED, state.gameData.selectedUnit);

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

        const isSelected = state.gameData.selectedUnit === id;
        if (!isSelected) return;

        emit(signals.UNIT_DESELECTED, id);
      },
    ],
    [
      signals.UNIT_DESELECTED,
      (_id: string) => {
        state.gameData.selectedUnit = null;
      },
    ]
  ]);
}
