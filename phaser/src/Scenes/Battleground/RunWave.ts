import { BattlegroundScene } from "./BattlegroundScene";
import { getActiveUnits, State, } from "../../Models/State";
import { FORCE_ID_CPU, FORCE_ID_PLAYER, MIN_COOLDOWN } from "./constants";
import * as UnitManager from "./Systems/UnitManager";
import { updateChargeBar } from "../../Systems/Chara/Chara";
import { performAction } from "./performAction";
import { Unit } from "../../Models/Unit";
import { tween } from "../../Utils/animation";

export type WaveOutcome = "player_won" | "player_lost";

async function setupWave(scene: BattlegroundScene) {
  UnitManager.clearCharas();

  scene.state.battleData.units.forEach(u => {
    u.charge = 0;
    u.cooldown = 0;
  });

  scene.state.battleData.units.forEach(u => UnitManager.summonChara(u, false, false));

  const cpuCharas = UnitManager.getCPUCharas();

  await Promise.all(cpuCharas.map(async (chara, i) => {

    const originalX = chara.container.x;
    chara.container.x = chara.container.x - 1000;

    await tween({
      targets: [chara.container],
      x: originalX,
      duration: 500,
      delay: i * 100,
    })
  }));

  scene.state.battleData.units
    .forEach(u =>
      u.equip?.type?.key === "equipment" && u.equip.type.onCombatStart(u)
    );

  scene.state.battleData.units
    .forEach(u =>
      u.events.onBattleStart.forEach(fn => fn(u))
    );

}

const runWaveIO = (
  scene: BattlegroundScene,
) => new Promise<WaveOutcome>(async resolve => {
  const { state } = scene;

  await setupWave(scene);

  console.log("[runWaveIO]");

  const updateHandler = (_time: number, delta: number) => {

    const units = chargeUnits(state, delta);

    for (const unit of units)
      performAction(scene)(unit)();

    // TODO: move this to on unit death
    const result = checkEndOfWave(scene);

    if (result === "no_op") return;

    scene.events.off('update', updateHandler)

    resolve(result);

  }

  scene.events.on('update', updateHandler)

}

);

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

    const chara = UnitManager.getChara(unit.id);
    updateChargeBar(chara);

  }

  return performUnits;

}

function checkEndOfWave(scene: BattlegroundScene): ("no_op" | WaveOutcome) {

  const playerUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = scene.state.battleData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  if (playerUnits.length === 0)
    return "player_lost";
  if (cpuUnits.length === 0)
    return "player_won";
  return "no_op";


}


export default runWaveIO;