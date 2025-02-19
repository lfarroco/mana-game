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

        state.gameData.selectedUnit = id;

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
    ],
    [
      signals.BATTLEGROUND_TICK,
      () => {
        if (state.gameData.selectedUnit)
          emit(signals.UNIT_DESELECTED, state.gameData.selectedUnit);
      }
    ]
  ]);
}
