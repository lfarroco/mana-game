import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getActiveUnits, getState } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { getJob, Job } from "../../Models/Job";
import { asVec2, sortBySnakeDistance, Vec2 } from "../../Models/Geometry";
import { runPromisesInOrder as sequenceAsync } from "../../utils";
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

  if (availableSkills.length > 0) {

    const skillId = availableSkills[0];

    const skill = getSkill(skillId)

    if (skillId === "shieldbash") {

      unit.cooldowns[skillId] = skill.cooldown

      const mtarget = await approach(activeChara, 1, true);

      if (mtarget) {
        await specialAnimation(activeChara);
        await shieldBash(scene, activeChara.unit, mtarget);
        scene.createParticle(mtarget.id, "stun")
      }
    }

  } else if (job.baseAttack === "slash") {

    const mtarget = await approach(activeChara, 1, true);
    if (mtarget)
      await slash(scene, unit, mtarget)
  }
  else if (job.baseAttack === "heal") {
    await healing(scene)(unit);
  }
  else if (job.baseAttack === "shoot") {
    await shoot(scene)(unit);
  } else if (job.baseAttack === "fireball") {
    await fireball(scene)(unit);
  }

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