import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getActiveUnits, getState } from "../../Models/State";
import { makeUnit, Unit, unitLog } from "../../Models/Unit";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob } from "../../Models/Job";
import { asVec2, eqVec2, sortBySnakeDistance, vec2, Vec2 } from "../../Models/Geometry";
import { runPromisesInOrder, runPromisesInOrder as sequenceAsync } from "../../utils";
import { vignette } from "./Animations/vignette";
import { shoot } from "../../Systems/Chara/Skills/shoot";
import { healing } from "../../Systems/Chara/Skills/healing";
import { slash } from "../../Systems/Chara/Skills/slash";
import { fireball } from "../../Systems/Chara/Skills/fireball";
import { GOLD_PER_WAVE } from "./constants";
import { approach } from "../../Systems/Chara/approach";
import { getSkill } from "../../Models/Skill";
import { shieldBash } from "../../Systems/Chara/Skills/shieldBash";
import { specialAnimation } from "../../Systems/Chara/Animations/specialAnimation";
import { multishot } from "../../Systems/Chara/Skills/multishot";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

  state.inputDisabled = true;

  const unitActions = getActiveUnits(state)
    .map(performAction(scene));

  await sequenceAsync(unitActions);

  state.inputDisabled = false;

  const playerUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_PLAYER);
  const cpuUnits = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === FORCE_ID_CPU);

  if (cpuUnits.length === 0) {
    await vignette(scene, "Victory!");

    scene.playerForce.gold += GOLD_PER_WAVE;

    await delay(scene, 1000 / state.options.speed);

    emit(signals.WAVE_FINISHED, FORCE_ID_PLAYER);

  } else if (playerUnits.length === 0) {

    scene.playerForce.gold += GOLD_PER_WAVE;

    scene.playerForce.hp = Math.max(0, scene.playerForce.hp - cpuUnits.length);

    await vignette(scene, "Defeat!");

    await delay(scene, 1000 / state.options.speed);

    emit(signals.WAVE_FINISHED, FORCE_ID_CPU);

  } else {

    state.gameData.tick++;
    emit(signals.TURN_END)
    await processTick(scene);
  }

};

const performAction = (
  scene: BattlegroundScene,
) => (
  unit: Unit,
) => async () => {

  if (unit.hp <= 0) return;

  const job = getJob(unit.job);

  const activeChara = scene.getChara(unit.id);

  await panTo(scene, asVec2(activeChara.container));

  const availableSkills = job.skills.filter(skillId => {
    const cooldown = unit.cooldowns[skillId]

    return cooldown === 0
  });

  // decrease cooldowns
  job.skills.forEach(skillId => {
    unit.cooldowns[skillId] = Math.max(0, unit.cooldowns[skillId] - 1);
  });

  if (unit.statuses.stun >= 0) return;

  const [skillId] = availableSkills;

  const skill = getSkill(skillId)

  if (skillId === "shieldbash") {

    const casted = await shieldBash(scene, activeChara.unit);
    if (casted) {
      unit.cooldowns[skillId] = skill.cooldown
    }

  } else if (skillId === "summon_blob") {

    await specialAnimation(activeChara);

    await summon(unit, scene);

    unit.cooldowns[skillId] = skill.cooldown

  } else if (skillId === "multishot") {

    await specialAnimation(activeChara);

    await multishot(unit, activeChara, scene);

    unit.cooldowns[skillId] = skill.cooldown

  } else if (skillId === "slash") {

    const mtarget = await approach(activeChara, 1, true);
    if (mtarget)
      await slash(scene, unit, mtarget)
  }
  else if (skillId === "heal") {
    await healing(scene)(unit);
  }
  else if (skillId === "shoot") {
    await shoot(scene)(unit);
  } else if (skillId === "fireball") {
    await fireball(scene)(unit);
  }

}

async function summon(unit: Unit, scene: BattlegroundScene) {
  let emptySlots = [] as Vec2[];

  // pick 4 empty slots close to the unit
  let i = 1;
  while (emptySlots.length < 4 && i < 5) {
    const slots = [
      vec2(unit.position.x + i, unit.position.y),
      vec2(unit.position.x - i, unit.position.y),
      vec2(unit.position.x, unit.position.y + i),
      vec2(unit.position.x, unit.position.y - i),
    ];

    emptySlots = emptySlots.concat(
      slots.filter(slot => {
        const unitAtSlot = scene.state.gameData.units
          .filter(u => u.hp > 0)
          .find(u => eqVec2(u.position, slot));
        return !unitAtSlot;
      })
    );

    i++;
  }

  emptySlots = emptySlots.slice(0, 4);

  // create a blob in each slot
  const actions = emptySlots.map(slot => async () => {
    const blob = makeUnit(Math.random().toString(), FORCE_ID_CPU, "blob", slot);
    scene.state.gameData.units.push(blob);
    scene.renderUnit(blob);
    await delay(scene, 500 / scene.state.options.speed);
  });

  await runPromisesInOrder(actions);

}

export async function walk(
  scene: BattlegroundScene,
  unit: Unit,
  path: Vec2[],
  interrupt: null | ((vec: Vec2) => boolean),
) {

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

    if (interrupt && interrupt(next)) break;
    walked++;
  }

}

export function getUnitsByProximity(state: State, unit: Unit, enemy: boolean): Unit[] {
  return getActiveUnits(state)
    .filter(u => enemy ? u.force !== unit.force : u.force === unit.force)
    .filter(u => u.id !== unit.id)
    .sort((a, b) => sortBySnakeDistance(unit.position)(a.position)(b.position));
}

export async function panTo(scene: BattlegroundScene, vec: Vec2) {

  if (!scene.state.options.scrollEnabled) return;

  const speed = getState().options.speed

  scene.cameras.main.pan(vec.x, vec.y, 500 / speed, "Expo.easeOut", false);

  await delay(scene, 500 / speed);
}

export default processTick;