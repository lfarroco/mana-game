import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "./constants";
import { vignette } from "./Animations/vignette";
import { performAction } from "./performAction";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";
import { createWave } from "./Systems/WaveManager";
import { displayChoices } from "./Systems/Choice";
import * as UIManager from "./Systems/UIManager";
import { Unit } from "../../Models/Unit";

const processTick = async (
  scene: BattlegroundScene,
  adventure: {
    generate: () => Unit[];
    current: number;
    total: number
  }
) => {
  const state = getState();

  let continueProcessing = true;

  while (continueProcessing) {

    const activeUnits = getActiveUnits(state);

    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      await performAction(scene)(unit)();

      const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
      const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

      if (cpuUnits.length === 0) {
        if (UIManager.uiState.interruptCommand) {
          const shouldReturnToTown = await shouldInterrupt();

          if (shouldReturnToTown) {
            waveFinished(scene);
            continueProcessing = false;
            return;
          } else {
            UIManager.uiState.interruptCommand = false;
          }
        }

        await delay(scene, 1000 / state.options.speed);

        const playerUnits = state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER);

        return await createWave([...playerUnits], adventure)

      } else if (playerUnits.length === 0) {

        await vignette(scene, "End of Run!");

        await delay(scene, 1000 / state.options.speed);

        waveFinished(scene);
        continueProcessing = false;
        return;
      }
    }

    //run end of turn effects
    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      for (const effect of unit.events.onTurnEnd) {
        await effect(unit)();
      }

      for (const [key, status] of Object.entries(unit.statuses)) {
        if (status.duration > 0) {
          status.duration--;
          await status.effect(unit)();
        } else {
          delete unit.statuses[key];
        }
      }

    }

    if (continueProcessing) {
      state.gameData.tick++;
    }
  }
};

async function shouldInterrupt() {
  const choice = await displayChoices([
    { pic: "icon/forest_entrance", title: "Continue", desc: "Continue the adventure", value: "continue" },
    { pic: "icon/agility_training", title: "Retreat", desc: "Return to town", value: "retreat" },
  ])

  if (choice.value === "continue") {
    return false;
  }
  if (choice.value === "retreat") {
    return true;
  }
}

function waveFinished(scene: BattlegroundScene) {
  showGrid();

  refreshScene(scene)
}

export default processTick;