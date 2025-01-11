import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { Unit } from "../../Models/Unit";
import { State } from "../../Models/State";
import { distanceBetween } from "../../Models/Geometry";

export function processDefenderActions(state: State) {

  if (state.gameData.winner)
    return;

  (state.gameData.ai.defenders
    .map(id => state.gameData.units.find(unit => unit.id === id))
    .filter(unit => unit) as Unit[]
  )
    .forEach(u => {
      //find closest city
      const [closestCity] = state.gameData.cities
        .filter(city => city.force === FORCE_ID_CPU)
        .sort((a, b) => {
          const distA = distanceBetween(a.boardPosition)(u.position);
          const distB = distanceBetween(b.boardPosition)(u.position);
          return distA - distB;
        });

      if (!closestCity) {
        console.error("no closest city found");
        return;
      }

      if (eqVec2(closestCity.boardPosition, u.position)) {
        return;
      }

    });
}

