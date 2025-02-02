import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState, getUnit } from "../../Models/State";
import { Unit, unitLog } from "../../Models/Unit";
import { delay, tween } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { lookupAIPAth } from "./Systems/Pathfinding";
import { getJob } from "../../Models/Job";
import { asVec2, Vec2 } from "../../Models/Geometry";
import { getSkill } from "../../Models/Skill";
import { bashPieceAnimation } from "../../Systems/Chara/Animations/bashPieceAnimation";
import { popText } from "../../Systems/Chara/Animations/popText";
import { slashAnimation } from "../../Systems/Chara/Animations/slashAnimation";
import { runPromisesInOrder } from "../../utils";
import { vignette } from "./Animations/vignette";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  await vignette(scene, "Move Phase");

  const state = getState();

  state.inputDisabled = true;

  console.log("set AI actions");

  // hide emotes
  state.gameData.units.forEach(u => {
    emit(signals.HIDE_EMOTE, u.id);
  });

  state.gameData.units
    .filter(u => u.hp > 0)
    .filter(u => u.force === FORCE_ID_CPU)
    .forEach(checkAgroo(state, scene));

  await delay(scene, 1000 / state.options.speed);

  console.log("start movement phase")
  await moveStep(scene, state);
  console.log("ended movement phase")

  await vignette(scene, "Combat Phase");

  console.log("start combat phase")
  await combatStep(scene, state);
  console.log("ended combat phase")

  state.gameData.tick++;
  emit(signals.TURN_END)

  scene.displayOrderEmotes();

  state.inputDisabled = false;

  await vignette(scene, "End of turn");
};


const performMovement = (
  scene: BattlegroundScene,
  state: State,
) => (
  unit: Unit,
) => async () => {

  const job = getJob(unit.job);

  if (unit.order.type !== "move") return;

  const path = await lookupAIPAth(scene, unit.id, unit.position, unit.order.cell);

  emit(signals.PATH_FOUND, unit.id, path);
  unit.path = path;
  let remainingSteps = job.moveRange * 1;

  while (remainingSteps > 0 && unit.order.type === "move" && unit.hp > 0) {
    unitLog(unit, `remaining steps: ${remainingSteps}`);
    await step(scene, state, unit);
    unitLog(unit, "finished whalking");
    remainingSteps--;
  }

  emit(signals.MOVEMENT_FINISHED, unit.id, unit.position);

}

async function step(scene: BattlegroundScene, state: State, unit: Unit) {

  if (unit.order.type !== "move") {
    unitLog(unit, "no move order, skipping step");
    return;
  }
  const [next] = unit.path;

  if (!next) {
    unitLog(unit, "invalid state :: no next cell to move to");
    return;
  }

  const unitChara = scene.getChara(unit.id);

  await panTo(scene, asVec2(unitChara.container));

  const blocker = scene.getCharaAt(next);

  if (blocker) {

    // is the unit an ally? if so, stop. otherwise, attack

    if (blocker.unit.force === unit.force) {

      unitLog(unit, `blocked by ally -> ${blocker.unit.id}`);

      emit(signals.MAKE_UNIT_IDLE, unit.id);
      return;
    } else {
      // agroo
      unitLog(unit, `blocked by enemy -> ${blocker.unit.id}`);
      emit(signals.HIDE_EMOTE, unit.id);
      unit.order = {
        target: blocker.unit.id,
        type: "skill-on-unit",
        skill: "slash",
      }

      return;
    }

  }

  // check if attack of opportunity is triggered

  const closeEnemies = state.gameData.units
    .filter(u => u.hp > 0)
    .filter(u => u.force !== unit.force)
    .map(u => {
      const distance = Phaser.Math.Distance.BetweenPoints(u.position, unit.position);
      return { unit: u, distance }
    })
    .filter(u => u.distance === 1);

  if (closeEnemies.length > 0) {
    unitLog(unit, `triggered attack of opportunity by ${closeEnemies.map(u => u.unit.id)}`);

    for (const enemy of closeEnemies) {
      unitLog(enemy.unit, `attacking because of attack of opportunity -> ${unit.job}`);

      await popText(scene, "Attack of Opportunity!", enemy.unit.id);

      await cast(scene, state, enemy.unit, "slash", unit.id);
      emit(signals.HIDE_EMOTE, enemy.unit.id);
      if (unit.hp <= 0) {
        unitLog(unit, "killed by attack of opportunity, skipping movement phase");
        return;
      } else {
        unitLog(unit, "survived attack(s) of opportunity, continuing movement phase");
      }
    }

  }

  emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

  scene.playFx("audio/chip-lay-3")

  await delay(scene, 500 / state.options.speed);

  unit.position = next;

  const remaining = unit.path.slice(1);

  if (remaining.length > 0) {
    unit.path = remaining;
    unit.order = {
      type: "move",
      cell: remaining[remaining.length - 1]
    }
  } else {
    emit(signals.MOVEMENT_FINISHED, unit.id, next);
    unit.order = {
      type: "none"
    }
    if (unit.force === FORCE_ID_PLAYER) {
      emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
    }
  }

}

// TODO: check if unit can heal while moving
function checkHeals(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    if (unit.order.type === "move") return;

    const allies = state.gameData.units.filter(u => u.hp > 0).filter(u => u.force === unit.force);

    const closeAllies = allies.filter((a) => {
      const distance = Phaser.Math.Distance.Snake(a.position.x, a.position.y, unit.position.x, unit.position.y);
      return distance <= 3;
    });

    const mostHurt = closeAllies
      .filter(u => u.hp < u.maxHp)
      .sort((a, b) => a.hp - b.hp);

    if (mostHurt.length === 0) return;

    const target = mostHurt[0];

    unit.order = {
      type: "skill-on-unit",
      skill: "heal",
      target: target.id,
    }

  }
}


function checkAgroo(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    // units that already has an order can skip this step (if target is still alive)
    if (unit.order.type === "skill-on-unit") {
      const maybeTarget = scene.getChara(unit.order.target);
      if (maybeTarget && maybeTarget.unit.hp > 0) {

        const distance = Phaser.Math.Distance.BetweenPoints(unit.position, maybeTarget.unit.position);

        if (distance === 1) {
          unitLog(unit, 'target is alive and in range, skipping agroo check')
          return;
        } else {
          unitLog(unit, "target is alive but out of range, will chase target");
          // const path = await lookupAIPAth(scene, unit.id, unit.position, maybeTarget.unit.position);
          // if (path.length > 0) {
          //   emit(signals.PATH_FOUND, unit.id, path);
          //   return;
          // } else {
          //   unitLog(unit, "path not found, will wait for next turn");
          //   return;
          // }
        }
      } else {
        unitLog(unit, "unit has died or moved, looking for new target")
      }

    }

    const [closestEnemy] = state.gameData.units
      .filter(u => u.hp > 0)
      .filter(u => u.force !== unit.force)
      .sort((a, b) => {
        const aDist = Phaser.Math.Distance.BetweenPoints(a.position, unit.position);
        const bDist = Phaser.Math.Distance.BetweenPoints(b.position, unit.position);
        return aDist - bDist;
      });

    if (!closestEnemy) {
      unitLog(unit, "no enemies to attack");
      return;
    };

    const distance = Phaser.Math.Distance.BetweenPoints(unit.position, closestEnemy.position);

    if (distance === 1) {
      if (unit.order.type === "move" && unit.path.length > 0) {

        const maybeBlocker = scene.getCharaAt(unit.path[0]);
        if (!maybeBlocker) {
          unitLog(unit, "unit can attack but is moving and is not blocked")
          return;
        }

      }
      unit.order = {
        type: "skill-on-unit",
        skill: "slash",
        target: closestEnemy.id
      };
    } else {
      if (unit.force !== FORCE_ID_CPU) return;
      const path = await lookupAIPAth(scene, unit.id, unit.position, closestEnemy.position);
      if (path.length > 0) {
        emit(signals.PATH_FOUND, unit.id, path);
      }
    }

  };
}

async function moveStep(scene: BattlegroundScene, state: State) {

  const unitsToMove = state.gameData.units
    .filter(u => u.hp > 0)
    .filter(u => u.order.type === "move")
    .map(performMovement(scene, state));

  await runPromisesInOrder(unitsToMove);

}

async function combatStep(scene: BattlegroundScene, state: State) {

  const skills = state.gameData.units
    .filter(u => u.hp > 0)
    .map(unit => {

      return async () => {
        unitLog(unit, "start combat step")

        if (unit.hp <= 0) {
          unitLog(unit, "unit is dead: skipping combat step");
          return;
        }

        // TODO: use skill range to determine if unit can attack on melee
        if (["monk", "soldier", "orc"].includes(unit.job))
          await checkAgroo(state, scene)(unit);
        else
          await checkHeals(state, scene)(unit);

        // TODO: maybe create type "unit with skill" to avoid this redundant check
        if (unit.order.type !== "skill-on-unit") return async () => {
          unitLog(unit, "skill order: skip combat step");
          return;
        }

        await cast(scene, state, unit, unit.order.skill, unit.order.target);

      }
    });

  await runPromisesInOrder(skills)

}

async function cast(
  scene: BattlegroundScene,
  state: State,
  unit: Unit,
  skillId: string,
  targetId: string,
) {

  unitLog(unit, `casting skill ${skillId} on ${targetId}`);
  const activeChara = scene.getCharaAt(unit.position)

  const targetUnit = getUnit(state)(targetId);

  const targetChara = scene.getChara(targetId);

  if (!activeChara) { throw new Error("no active unit\n" + unit.id) }

  const skill = getSkill(skillId)

  panTo(scene, asVec2(activeChara.container));

  //@ts-ignore
  scene.children.bringToTop(activeChara.group);

  //const damageDisplay = createDamageDisplay(scene, targetUnit);

  // is target still alive?
  if (targetUnit.hp <= 0) {
    unitLog(unit, "target is dead, skipping cast");
    emit(signals.MAKE_UNIT_IDLE, unit.id);
    if (unit.force === FORCE_ID_PLAYER) {
      emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
    }
    await delay(scene, 1000 / state.options.speed);
    emit(signals.HIDE_EMOTE, unit.id);
    return;
  }

  unitLog(unit, `will cast ${skill.name} on ${targetUnit.id}`);

  await popText(scene, skill.name, unit.id)

  if (skill.id === "slash") {

    bashPieceAnimation(scene, state, activeChara, targetUnit);

    await slashAnimation(scene, activeChara, targetChara, skill.power);

    emit(
      signals.DAMAGE_UNIT,
      targetUnit.id,
      skill.power,
    );

  }

  if (skillId === "heal") {

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
      duration: 500 / state.options.speed,
    })

    popText(scene, skill.power.toString(), targetUnit.id)

    await delay(scene, 500 / state.options.speed);

    await tween(scene, {
      targets: sprite,
      alpha: 0,
      duration: 500 / state.options.speed,
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