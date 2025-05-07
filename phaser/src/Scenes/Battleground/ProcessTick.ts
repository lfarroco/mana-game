import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, getState, } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, TICK_DURATION } from "./constants";
import { vignette } from "./Animations/vignette";
import { performAction } from "./performAction";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";
import { createWave } from "./Systems/WaveManager";
import * as bar from "./Systems/ProgressBar";
import { Adventure } from "../../Models/Adventure";
import { dropItem } from "../../Systems/Item/ItemDrop";
import { getAllCharas } from "./Systems/UnitManager";
import { updateChargeBar } from "../../Systems/Chara/Chara";

const processTick = async (
  scene: BattlegroundScene,
  adventure: Adventure,
) => {
  const state = getState();

  console.log("processTick:: tick", state.gameData.tick);

  const event = scene.time.addEvent({
    delay: TICK_DURATION,
    callback: () => {

      dostuff();

      getAllCharas().forEach(chara => {
        updateChargeBar(chara);
      });

    },
    loop: true,
  });

  //@ts-ignore
  window.evv = event;

  const finishAdventure = () => {
    waveFinished(scene);
  }

  async function dostuff() {

    console.log("[~~~start~~~")

    const activeUnits = getActiveUnits(state);

    for (const unit of activeUnits) {
      if (unit.hp <= 0) continue;

      unit.charge += TICK_DURATION;

      console.log(`[${unit.job}] charge: ${unit.charge}`)

      if (unit.charge < unit.agility) continue;
      else
        unit.charge = unit.charge - unit.agility;

      // TODO: track which one is the active unit
      // if they overlap, throw an error
      performAction(scene)(unit)();

      console.log("~~~~end~~~]")

    }

    const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
    const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

    if (cpuUnits.length === 0) {

      const wave = adventure.waves[adventure.currentWave];

      if (wave.loot) {
        const loot = wave.loot();
        state.gameData.player.items.push(...loot);

        loot.forEach(item => dropItem(scene, { x: 300, y: 300 }, item))

        // TODO: proper loot screen
        vignette(scene, "Loot!")
      }


      if (adventure.currentWave >= adventure.waves.length - 1) {
        // TODO: proper victory screen

        finishWave();
        await vignette(scene, "Adventure completed, congratulations!")
        return finishAdventure();
      } else {
        adventure.currentWave++;
        bar.updateProgressBar(adventure);
      }
    }

    if (cpuUnits.length === 0) {


      finishWave();
      await delay(scene, 1000 / state.options.speed);

      const playerUnits = state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER);

      return await createWave([...playerUnits], adventure)

    }

    if (playerUnits.length === 0) {

      await vignette(scene, "End of Run!");

      await delay(scene, 1000 / state.options.speed);

      finishWave();
      return finishAdventure();
    }


  }

  function finishWave() {
    event.remove(false);

    scene.state.battleData.units.forEach(u => {
      u.charge = 0;
    });

    bar.updateProgressBar(adventure);
  }
};

function waveFinished(scene: BattlegroundScene) {
  showGrid();

  refreshScene(scene)
}

export default processTick;