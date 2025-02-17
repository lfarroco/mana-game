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

    const effectShader = new Phaser.Display.BaseShader('healingShader', `
      precision mediump float;
      
      uniform float time; // provided by Phaser
      uniform vec2 resolution; // provided by Phaser
      varying vec2 fragCoord; // provided by Phaser
      
      const int numPillars = 40;
      
      float random(float x) {
          return fract(sin(x * 12.9898) * 43758.5453);
      }
      
      void main() {
          // Normalize UV coordinates to [0.0, 1.0]
          vec2 uv = fragCoord.xy / resolution;
      
          // Center UV coordinates around (0.5, 0.5)
          uv -= 0.5;
      
          // Maintain aspect ratio
          uv.x *= resolution.x / resolution.y;
      
          float color = 0.0;
      
          // Define pillar bounds in normalized coordinates
          const float min_x = -0.404;  // Adjusted for centered positioning
          const float max_x = 0.372;
          const float min_y = -0.215;
          const float max_y = 0.191;
      
          for (int i = 0; i <= numPillars; i++) {
              float seed = float(i);
              float pillarX = min_x + random(seed) * (max_x - min_x);
              float pillarY = min_y + random(seed * 2.0) * (max_y - min_y);
              
              float distance = length(vec2((uv.x - pillarX) * 1.6, (uv.y - pillarY) * 0.3));
      
              float pillarWidth = 0.1 * abs(sin(seed / 40.0)); // Adjust width for normalized coords
              
              // Soft edges using smoothstep
              float pillar = smoothstep(pillarWidth, 0.0, distance);
              
              // Make the pillars fade in and out randomly
              float timeOffset = seed;
              float fade = sin(time * 10.0 + timeOffset) * 0.5 + 0.5;
              
              // Accumulate color (intensity) for the pillar
              color += pillar * fade;
          }
      
          // Only make the pillar visible where there's a non-zero color
          float alpha = max(color, 0.0);
      
          // Apply a slight glow effect
          color = pow(color, 1.5);
      
          // Set final fragment color: RGB glow (green) and transparency based on alpha
          gl_FragColor = vec4(vec3(0, color, 0), alpha);	 
          }
               `);

    const shader = scene.add.shader(effectShader,
      targetChara.container.x, targetChara.container.y,
      128, 128)
      .setOrigin(0.5, 0.5);

    popText(scene, skill.power.toString(), targetUnit.id)

    await delay(scene, 500 / scene.state.options.speed);

    shader.destroy();

    emit(signals.HEAL_UNIT, targetUnit.id, 50); // TODO: use skill's stats

  }
}

async function panTo(scene: BattlegroundScene, vec: Vec2) {

  if (!scene.state.options.scrollEnabled) return;

  const speed = getState().options.speed

  scene.cameras.main.pan(vec.x, vec.y, 500 / speed, "Expo.easeOut", false);

  await delay(scene, 500 / speed);
}

export default processTick;