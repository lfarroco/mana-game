import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { emit, signals } from "../../Models/Signals";
import { UNIT_STATUS_KEYS, Unit } from "../../Models/Unit";
import { State } from "../../Models/State";
import { distanceBetween } from "../../Models/Geometry";

export function processDefenderActions(state: State) {

  if (state.gameData.winner)
    return;

  (state.gameData.ai.defenders
    .map(id => state.gameData.units.find(squad => squad.id === id))
    .filter(squad => squad) as Unit[]
  )
    .forEach(sqd => {
      //find closest city
      const [closestCity] = state.gameData.cities
        .filter(city => city.force === FORCE_ID_CPU)
        .sort((a, b) => {
          const distA = distanceBetween(a.boardPosition)(sqd.position);
          const distB = distanceBetween(b.boardPosition)(sqd.position);
          return distA - distB;
        });

      if (!closestCity) {
        console.error("no closest city found");
        return;
      }

      if (eqVec2(closestCity.boardPosition, sqd.position)) {
        return;
      }

      if (sqd.status.type === UNIT_STATUS_KEYS.IDLE) {
        console.log("AI: moving", sqd.id, closestCity.boardPosition);
        emit(signals.SELECT_SQUAD_MOVE_DONE, sqd.id, closestCity.boardPosition);
        return;
      }

    });
}

