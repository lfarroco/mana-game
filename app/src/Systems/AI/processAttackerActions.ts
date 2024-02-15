import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { emit, signals } from "../../Models/Signals";
import { UNIT_STATUS_KEYS, Unit } from "../../Models/Unit";
import { State } from "../../Models/State";
import { distanceBetween } from "../../Models/Geometry";

export function processAttackerActions(state: State) {

  if (state.gameData.winner)
    return;

  (state.gameData.ai.attackers
    .map(id => state.gameData.units.find(unit => unit.id === id))
    .filter(unit => unit) as Unit[]
  )
    .forEach(u => {

      //find closest city
      const closestCity = state.gameData.cities
        .filter(city => city.force === FORCE_ID_CPU)
        .sort((a, b) => {
          const distA = distanceBetween(a.boardPosition)(u.position);
          const distB = distanceBetween(b.boardPosition)(u.position);
          return distA - distB;
        })[0];


      if (!closestCity) {
        console.error("no closest city found");
        return;
      }

      if (u.status.type === UNIT_STATUS_KEYS.IDLE && u.hp >= 80) {
        console.log("AI: attacking", u.id, closestCity.boardPosition);

        // is currently at a city? if so, wait to recharge all stamina
        if (eqVec2(closestCity.boardPosition, u.position) && u.hp < 100) {
          return;
        }
        // find a path
        // enemy castle
        const target = state.gameData.cities.find(city => city.force !== FORCE_ID_CPU && city.type === "castle");
        if (!target) {
          console.error("no target");
          return;
        }
        emit(signals.SELECT_UNIT_MOVE_DONE, u.id, target.boardPosition);
        return;
      }

      if (u.status.type === UNIT_STATUS_KEYS.IDLE && u.hp < 80) {

        console.log("AI: moving", u.id, closestCity.boardPosition);


        //is in an allied city?
        if (eqVec2(closestCity.boardPosition, u.position)) {
          return;
        }
        emit(signals.SELECT_UNIT_MOVE_DONE, u.id, closestCity.boardPosition);
      }

    });


}

