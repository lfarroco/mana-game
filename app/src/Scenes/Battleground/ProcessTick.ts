import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState, getUnit } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { lookupAIPAth } from "./Systems/Pathfinding";
import { getJob, Job } from "../../Models/Job";
import { asVec2, Vec2 } from "../../Models/Geometry";
import { getSkill } from "../../Models/Skill";
import { bashPieceAnimation } from "../../Systems/Chara/Animations/bashPieceAnimation";
import { popText } from "../../Systems/Chara/Animations/popText";
import { slashAnimation } from "../../Systems/Chara/Animations/slashAnimation";
import { runPromisesInOrder } from "../../utils";
import { vignette } from "./Animations/vignette";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

  state.inputDisabled = true;

  // hide emotes
  state.gameData.units.forEach(u => {
    emit(signals.HIDE_EMOTE, u.id);
  });

  await delay(scene, 1000 / state.options.speed);

  const unitsToAct = state.gameData.units
    .filter(u => u.hp > 0)
    .map(performAction(scene, state));

  await runPromisesInOrder(unitsToAct);

  state.gameData.tick++;
  emit(signals.TURN_END)

  //scene.displayOrderEmotes();

  state.inputDisabled = false;

  const playerUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  console.log(playerUnits.length, cpuUnits.length);

  if (cpuUnits.length === 0) {
    emit(signals.COMBAT_FINISHED, FORCE_ID_PLAYER);
    await vignette(scene, "Victory!");
  } else if (playerUnits.length === 0) {

    emit(signals.COMBAT_FINISHED, FORCE_ID_CPU);
    await vignette(scene, "Game Over");
  } else {

    await processTick(scene);
  }

};


const performAction = (
  scene: BattlegroundScene,
  state: State,
) => (
  unit: Unit,
) => async () => {

  if (["monk", "soldier", "orc"].includes(unit.job)) {
    await moveToMeleeTarget(state, scene)(unit)
    await melee(scene, unit)
  }
  else
    await checkHeals(scene.state, scene)(unit);
  //  await combatStep(scene, unit)

}

async function walk(scene: BattlegroundScene, unit: Unit, path: Vec2[]) {

  const job = getJob(unit.job);
  let walked = 0;

  while (walked < job.moveRange && path[walked]) {
    console.log(">> walked ", walked, "/", job.moveRange, "/", path.length - 1)
    await step(scene, scene.state, unit, path[walked]);
    console.log(">> walked a step")
    unitLog(unit, "finished whalking");
    walked++;
  }

}

async function step(scene: BattlegroundScene, state: State, unit: Unit, next: Vec2) {

  const unitChara = scene.getChara(unit.id);

  await panTo(scene, asVec2(unitChara.container));

  emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

  scene.playFx("audio/chip-lay-3")

  await delay(scene, 500 / state.options.speed);

  unit.position = next;

}

// TODO: check if unit can heal while moving
function checkHeals(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    const allies = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === unit.force);

    const closeAllies = allies.filter((a) => {
      const distance = Phaser.Math.Distance.Snake(a.position.x, a.position.y, unit.position.x, unit.position.y);
      return distance <= 3;
    });

    const mostHurt = closeAllies
      .filter(u => u.hp < u.maxHp)
      .sort((a, b) => a.hp - b.hp);

    if (mostHurt.length === 0) return;


  }
}

function moveToMeleeTarget(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    const [closestEnemy] = getCloseEnemies(state, unit);

    if (!closestEnemy) {
      unitLog(unit, "no enemies to attack");
      return;
    };

    const distance = Phaser.Math.Distance.BetweenPoints(unit.position, closestEnemy.position);

    console.log(">> distance to target: ", distance)
    if (distance < 1) return

    const path = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position);

    console.log(">> path to target: ", path)
    // remove last cell
    const path_ = path.slice(0, path.length - 1);

    await walk(scene, unit, path_);

  };
}

function getCloseEnemies(state: State, unit: Unit): Unit[] {
  return state.gameData.units
    .filter(u => u.hp > 0)
    .filter(u => u.force !== unit.force)
    .sort((a, b) => {
      const aDist = Phaser.Math.Distance.BetweenPoints(a.position, unit.position);
      const bDist = Phaser.Math.Distance.BetweenPoints(b.position, unit.position);
      return aDist - bDist;
    });
}

async function melee(
  scene: BattlegroundScene,
  unit: Unit,
) {

  const activeChara = scene.getChara(unit.id)

  const [closestEnemy] = getCloseEnemies(getState(), unit);

  const targetUnit = getUnit(scene.state)(closestEnemy.id);

  const targetChara = scene.getChara(targetUnit.id);

  if (!activeChara) { throw new Error("no active unit\n" + unit.id) }

  const job = getJob(unit.job);

  const skill = getSkill(job.skill)

  panTo(scene, asVec2(activeChara.container));

  //const damageDisplay = createDamageDisplay(scene, targetUnit);

  // is target still alive?
  if (targetUnit.hp <= 0) {
    unitLog(unit, "target is dead, skipping cast");
    if (unit.force === FORCE_ID_PLAYER) {
      emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
    }
    await delay(scene, 1000 / scene.state.options.speed);
    emit(signals.HIDE_EMOTE, unit.id);
    return;
  }

  unitLog(unit, `will cast ${skill.name} on ${targetUnit.id}`);

  await popText(scene, skill.name, unit.id)

  if (skill.id === "slash") {

    bashPieceAnimation(scene, scene.state, activeChara, targetUnit);

    await slashAnimation(scene, activeChara, targetChara, skill.power);

    emit(
      signals.DAMAGE_UNIT,
      targetUnit.id,
      skill.power,
    );

  }

  if (job.skill === "heal") {

    scene.playFx("audio/curemagic")

    const sprite = scene.add.sprite(
      targetChara.container.x, targetChara.container.y,
      "pipo-light-pillar",
    ).play("pipo-light-pillar")
      .setScale(0.5)
      .setOrigin(0.5, 0.5)
      .setAlpha(0);

    tween(scene, {
      targets: sprite,
      alpha: 0.5,
      duration: 500 / scene.state.options.speed,
    })

    popText(scene, skill.power.toString(), targetUnit.id)

    await delay(scene, 500 / scene.state.options.speed);

    await tween(scene, {
      targets: sprite,
      alpha: 0,
      duration: 500 / scene.state.options.speed,
    })

    sprite.destroy();

    emit(signals.HEAL_UNIT, targetUnit.id, 50); // TODO: use skill's stats

  }
}

async function panTo(scene: BattlegroundScene, vec: Vec2) {
  const speed = getState().options.speed

  scene.cameras.main.pan(vec.x, vec.y, 500 / speed, "Expo.easeOut", false);

  await delay(scene, 500 / speed);
}

export default processTick;