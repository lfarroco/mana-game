import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getActiveUnits, getState, getUnit } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { lookupAIPAth } from "./Systems/Pathfinding";
import { getJob } from "../../Models/Job";
import { asVec2, distanceBetween, sortByDistanceTo, Vec2 } from "../../Models/Geometry";
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

  const unitActions = getActiveUnits(state)
    .map(performAction(scene, state));

  await runPromisesInOrder(unitActions);

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

    const target = await moveToMeleeTarget(scene)(unit)
    await slash(scene, unit, target)
  }
  else if (unit.job === "cleric") {
    await checkHeals(scene.state, scene)(unit);
  }

}

async function walk(scene: BattlegroundScene, unit: Unit, path: Vec2[]) {

  const job = getJob(unit.job);
  let walked = 0;

  const unitChara = scene.getChara(unit.id);

  while (walked < job.moveRange && path[walked]) {
    const next = path[walked];

    await panTo(scene, asVec2(unitChara.container));

    emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

    scene.playFx("audio/chip-lay-3")

    await delay(scene, 200 / scene.state.options.speed);

    unit.position = next;
    unitLog(unit, "finished whalking");
    walked++;
  }

}

// TODO: check if unit can heal while moving
const checkHeals = (
  state: State,
  scene: BattlegroundScene,
) => async (unit: Unit) => {

  const hurtAllies = getActiveUnits(state)
    .filter(u => u.force === unit.force)
    .filter(u => u.hp < u.maxHp)
    .sort((a, b) => a.hp - b.hp);

  const [hurtAndClose] = hurtAllies
    .filter((a) => distanceBetween(a.position)(unit.position) <= 3)

  if (hurtAndClose) {
    await heal(scene, unit, hurtAndClose);
    return;
  }

  const [closerHurt] = hurtAllies.sort((a, b) => sortByDistanceTo(unit.position)(a.position)(b.position));

  if (closerHurt) {
    const path = await lookupAIPAth(scene, unit.id, unit.position, closerHurt.position);

    //remove 3 last tiles from the path
    const path_ = path.slice(0, path.length - 3);

    await walk(scene, unit, path_);

    if (path_.length < 1) {
      await heal(scene, unit, closerHurt);
    }

  }

};

// TODO: refactor to "move to range", and have allied/enemy as parameter
// 0 -> melee
// 1/3 -> ranged

const moveToMeleeTarget = (
  scene: BattlegroundScene,
) => async (unit: Unit): Promise<Unit> => {
  const { state } = scene;

  const [closestEnemy] = getCloseEnemies(state, unit);

  if (!closestEnemy) {
    throw new Error("no enemies found");
  };

  const distance = distanceBetween(unit.position)(closestEnemy.position);

  if (distance < 1) return closestEnemy

  const path = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position);

  await walk(scene, unit, path);

  return closestEnemy;

}

function getCloseEnemies(state: State, unit: Unit): Unit[] {
  return getActiveUnits(state)
    .filter(u => u.force !== unit.force)
    .sort((a, b) => sortByDistanceTo(unit.position)(a.position)(b.position));
}

async function slash(
  scene: BattlegroundScene,
  unit: Unit,
  target: Unit,
) {

  await popText(scene, "Slash", unit.id)

  const activeChara = scene.getChara(unit.id)

  const targetUnit = getUnit(scene.state)(target.id);

  const targetChara = scene.getChara(targetUnit.id);

  if (!activeChara) { throw new Error("no active unit\n" + unit.id) }

  panTo(scene, asVec2(activeChara.container));

  if (targetUnit.hp <= 0) {
    throw new Error("target is dead")
  }

  unitLog(unit, `will cast slash on ${targetUnit.id}`);

  bashPieceAnimation(activeChara, targetChara);

  await slashAnimation(scene, activeChara, targetChara, 10);

  emit(
    signals.DAMAGE_UNIT,
    targetChara.id,
    10
  );

}


async function heal(
  scene: BattlegroundScene,
  unit: Unit,
  target: Unit,
) {

  const activeChara = scene.getChara(unit.id)

  const targetUnit = getUnit(scene.state)(target.id);

  const targetChara = scene.getChara(targetUnit.id);

  if (!activeChara) { throw new Error("no active unit\n" + unit.id) }

  const job = getJob(unit.job);

  const skill = getSkill(job.skill)

  panTo(scene, asVec2(activeChara.container));

  if (targetUnit.hp <= 0) {
    throw new Error("target is dead")
  }

  unitLog(unit, `will cast ${skill.name} on ${targetUnit.id}`);

  await popText(scene, skill.name, unit.id)

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