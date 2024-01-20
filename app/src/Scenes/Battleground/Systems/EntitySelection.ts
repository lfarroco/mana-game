import { events, listeners } from "../../../Models/Signals";
import BattlegroundScene from "../BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      events.UNITS_SELECTED,
      (ids: string[]) => {
        scene.state.gameData.selectedUnits = ids;
      },
    ],
    [
      events.CITIES_SELECTED,
      (ids: string[]) => {
        scene.state.gameData.selectedCities = ids;
      },
    ],
  ]);
}

