import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State, } from "../../Models/State";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "./constants";
import { vignette } from "./Animations/vignette";
import { showGrid } from "./Systems/GridSystem";
import { refreshScene } from "./EventHandlers";
import { createWave } from "./Systems/WaveManager";
import * as progressBar from "./Systems/ProgressBar";
import { Adventure } from "../../Models/Adventure";
import { getChara } from "./Systems/UnitManager";
import { updateChargeBar } from "../../Systems/Chara/Chara";
import { performAction } from "./performAction";
import { Unit } from "../../Models/Unit";

const processTick = (
  scene: BattlegroundScene,
  adventure: Adventure,
) => new Promise<void>(resolve => {
  const { state } = scene;

  console.log("processTick:: tick", state.gameData.tick);

  const updateHandler = async (_time: number, delta: number) => {

    const units = chargeUnits(state, delta);

    for (const unit of units) {

      performAction(scene)(unit)();
    }

    // TODO: move this to on unit death
    checkEndOfWave(scene, adventure, turnOff);

  }

  const turnOff = () => {
    scene.events.off('update', updateHandler)
    resolve();
  };

  scene.events.on('update', updateHandler)

});

function finishWave(scene: BattlegroundScene, adventure: Adventure, onEnd: () => void) {
  onEnd();

  scene.state.battleData.units.forEach(u => {
    u.charge = 0;
    u.cooldown = 0;
  });

  progressBar.updateProgressBar(adventure);
}

function chargeUnits(state: State, delta: number): Unit[] {

  const activeUnits = getActiveUnits(state);

  let performUnits: Unit[] = []; // units that are ready to perform an action

  for (const unit of activeUnits) {
    if (unit.hp <= 0) continue;

    unit.charge += delta * state.options.speed;

    unit.cooldown = Math.max(0, unit.cooldown - delta);

    if (unit.charge >= unit.agility && unit.cooldown === 0) {
      unit.charge = unit.charge - unit.agility;
      unit.cooldown = MIN_COOLDOWN; // minimum space between actions 
      performUnits.push(unit);
    }

    const chara = getChara(unit.id);
    updateChargeBar(chara);

  }

  return performUnits;

}

async function checkEndOfWave(scene: BattlegroundScene, adventure: Adventure, onEnd: () => void) {

  const { state } = scene;
  const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  if (cpuUnits.length && playerUnits.length) return;

  if (cpuUnits.length === 0) {

    adventure.currentWave++;

    finishWave(scene, adventure, onEnd);

    if (adventure.currentWave > adventure.waves.length) {
      // TODO: proper victory screen

      await vignette(scene, "Adventure completed, congratulations!")

      return adventureFinished(scene);

    }

    await delay(scene, 1000 / state.options.speed);

    const playerUnits = state.battleData.units.filter(u => u.force === FORCE_ID_PLAYER);

    return await createWave([...playerUnits], adventure)

  }

  if (playerUnits.length === 0) {

    await vignette(scene, "End of Run!");

    await delay(scene, 1000 / state.options.speed);

    finishWave(scene, adventure, onEnd);

    return adventureFinished(scene);
  }

}

function adventureFinished(scene: BattlegroundScene) {
  showGrid();
  refreshScene(scene)
}

export default processTick;