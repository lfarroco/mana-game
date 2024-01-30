import { v4 } from "uuid";
import { FORCE_ID_CPU } from "../../Models/Force";
import { eqVec2 } from "../../Models/Geometry";
import { signals, listeners, emit } from "../../Models/Signals";
import { State } from "../../Models/State";
import { makeUnit } from "../../Models/Unit";
import * as attackActions from "./processAttackerActions";
import * as defenderActions from "./processDefenderActions";

export function init(state: State) {
  listeners([
    [
      signals.BATTLEGROUND_TICK,
      () => attackActions.processAttackerActions(state),
    ],
    [
      signals.BATTLEGROUND_TICK,
      () => defenderActions.processDefenderActions(state),
    ],
    [signals.BATTLEGROUND_TICK, () => recruit(state)],
  ]);
}

function recruit(state: State) {
  const cpuForce = state.gameData.forces.find((f) => f.id === FORCE_ID_CPU);
  if (!cpuForce) throw new Error("cpu force not found");

  const aiOwnedTaverns = state.gameData.cities.filter(
    (city) => city.force === FORCE_ID_CPU && city.type === "tavern"
  );

  const unblockedTaverns = aiOwnedTaverns.filter(
    (tavern) =>
      !state.gameData.squads.some((squad) =>
        eqVec2(squad.position, tavern.boardPosition)
      )
  );

  unblockedTaverns.forEach((tavern) => {
    if (cpuForce.gold < 100) return;

    const id = v4();
    emit(
      signals.RECRUIT_UNIT,
      id,
      FORCE_ID_CPU,
      "skeleton",
      tavern.boardPosition
    );

    cpuForce.gold -= 100;

    state.gameData.ai.attackers.push(id);
  });
}
