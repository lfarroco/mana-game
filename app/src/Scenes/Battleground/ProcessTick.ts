import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";
import { Chara } from "../../Systems/Chara/Chara";
import { delay, tween, tweenSequence } from "../../Utils/animation";
import { FORCE_ID_CPU } from "../../Models/Force";
import { lookupPath } from "./Systems/Pathfinding";
import { getJob } from "../../Models/Job";
import { Vec2 } from "../../Models/Geometry";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

  console.log("set AI actions");

  state.gameData.units
    .filter(u => u.hp > 0)
    .filter(u => u.force === FORCE_ID_CPU)
    .forEach(checkAgroo(state, scene));

  await delay(scene, 1000 / state.options.speed);

  console.log("start movement phase")
  await moveStep(scene, state);
  console.log("ended movement phase")

  console.log("start combat phase")
  await combatStep(scene, state);
  console.log("ended combat phase")

  state.gameData.tick++;
  emit(signals.TURN_END)
};


const performMovement = (
  scene: BattlegroundScene,
  state: State,
) => (
  unit: Unit,
) => async () => {

  const job = getJob(unit.job);
  let remainingSteps = job.moveRange * 1;

  while (remainingSteps > 0 && unit.order.type === "move" && unit.hp > 0) {
    console.log(unit.job, ":: remaining steps", remainingSteps);
    await step(scene, state, unit);
    console.log(unit.job, ":: walked!");
    remainingSteps--;
  }

}

async function step(scene: BattlegroundScene, state: State, unit: Unit) {

  if (unit.order.type !== "move") {
    console.warn("invalid state :: unit has no move order", unit.id);
    return;
  }
  const [next] = unit.order.path;

  if (!next) {
    console.warn("invalid state :: no next cell to move to", unit.id);
    return;
  }

  const chara = scene.getCharaAt(next);

  if (chara) {

    // is the unit an ally? if so, stop. otherwise, attack

    if (chara.unit.force === unit.force) {

      console.log(unit.job, " :: blocked by ally -> ", chara.unit.job);

      emit(signals.MAKE_UNIT_IDLE, unit.id);
      return;
    } else {
      // agroo
      console.log(unit.job, " :: blocked because enemy is on the way -> ", chara.unit.job);
      emit(signals.HIDE_EMOTE, unit.id);
      unit.order = {
        target: chara.unit.position,
        type: "skill",
        skill: "attack",
      }

      emit(signals.DISPLAY_EMOTE, unit.id, "combat-emote");
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
    console.log(unit.job, ":: triggered attack of opportunity by ", closeEnemies.map(u => u.unit.job));

    for (const enemy of closeEnemies) {
      console.log(enemy.unit.job, ":: attacking because of attack of opportunity -> ", unit.job);
      await cast(scene, state, enemy.unit, "attack", unit.position);
      if (unit.hp <= 0) {
        console.log(unit.job, ":: unit has been killed by attack of opportunity, skipping movement phase");
        return;
      } else {
        console.log(unit.job, ":: unit has survived attack of opportunity, continuing movement phase");
      }
    }

  }

  emit(signals.MOVE_UNIT_INTO_CELL, unit.id, next);

  await delay(scene, 500 / state.options.speed);

  unit.position = next;

  const remaining = unit.order.path.slice(1);

  if (remaining.length > 0) {
    unit.order = {
      type: "move",
      path: remaining
    }
  } else {
    emit(signals.MOVEMENT_FINISHED, unit.id, next);
    unit.order = {
      type: "none"
    }
  }

}


function checkAgroo(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    // units that already have an order can skip this step
    if (unit.order.type === "skill") {
      const maybeTarget = scene.getCharaAt(unit.order.target);
      if (maybeTarget) {
        console.log("target unit still alive and in position, continuing", unit.job);
        return;
      } else {
        console.log("unit has died or moved, looking for new target", unit.job)
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
      console.log("no enemies to attack");
      return;
    };

    const distance = Phaser.Math.Distance.BetweenPoints(unit.position, closestEnemy.position);

    console.log(">>>", distance);
    if (distance === 1) {
      if (unit.order.type === "move") {

        const maybeBlocker = scene.getCharaAt(unit.order.path[0]);
        if (!maybeBlocker) {
          console.log("unit can attack but is moving and is not blocked", unit.job)
          return;
        }

      }
      unit.order = {
        type: "skill",
        skill: "attack",
        target: closestEnemy.position
      };
      emit(signals.DISPLAY_EMOTE, unit.id, "combat-emote");
    } else {
      if (unit.force !== FORCE_ID_CPU) return;
      await lookupPath(scene, unit.id, unit.position, closestEnemy.position);
    }

  };
}

async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
  for (const func of promiseFunctions) {
    await func();
  }
  return promiseFunctions
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
        console.log("=== combat step :: ", unit.job, "====")

        if (unit.hp <= 0) return;
        await checkAgroo(state, scene)(unit);
        // TODO: maybe create type "unit with skill" to avoid this redundant check
        if (unit.order.type !== "skill") return async () => {
          console.log("unit has no skill order, so skipping", unit.job);
          return;
        }

        if (unit.hp <= 0) return async () => {
          console.log("unit has died, so skipping skill", unit.job);
        };

        await cast(scene, state, unit, unit.order.skill, unit.order.target);

      }
    });

  await runPromisesInOrder(skills)

}

async function cast(
  scene: BattlegroundScene,
  state: State,
  unit: Unit,
  skill: string,
  target: Vec2,
) {

  console.log(unit.job, " :: casting skill -> ", skill);
  const activeChara = scene.getCharaAt(unit.position)

  const targetChara = scene.getCharaAt(target)

  if (!activeChara) {
    throw new Error(
      "no active unit\n" +
      JSON.stringify({ activeChara }, null, 2)
    )
  }

  if (!targetChara) {
    throw new Error("no target unit\n")
  }

  const container = createDamageDisplay(scene, targetChara);

  // is target still alive?
  if (targetChara.unit.hp <= 0) {
    console.log("target is dead", targetChara.unit.id);
    emit(signals.MAKE_UNIT_IDLE, unit.id);
    emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
    await delay(scene, 1000 / state.options.speed);
    emit(signals.HIDE_EMOTE, unit.id);
    return;
  }


  // make the unit move backwards, then forwards to attack
  bashCardAnimation(scene, state, activeChara, targetChara);

  await delay(scene, 500 / state.options.speed);

  await tween(scene, {
    targets: container,
    scale: 0.35,
    duration: 300 / state.options.speed,
    ease: "Bounce.easeOut",
  });

  console.log("will attack", targetChara.unit.id, targetChara.unit.hp);

  emit(
    signals.DAMAGE_UNIT,
    targetChara.unit.id,
    100
  );

  await tween(scene, {
    targets: container,
    alpha: 0,
    duration: 700 / state.options.speed,
  });

  container.destroy(true);
}

function createDamageDisplay(scene: BattlegroundScene, targetChara: Chara) {
  const damageBg = scene.add.image(
    0, 0,
    "damage_display",
  )
    .setOrigin(0.5, 0.5);

  const damage = scene.add.text(
    0, 0,
    "10",
    {
      fontSize: "96px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 2,
      align: "center",
      fontStyle: "bold",
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 0,
        stroke: false,
        fill: true,
      }
    })
    .setOrigin(0.5, 0.5)

  const container = scene.add.container(
    targetChara.sprite.x, targetChara.sprite.y, [damageBg, damage]
  ).setScale(0);

  return container;
}

async function bashCardAnimation(
  scene: BattlegroundScene,
  state: State,
  activeChara: Chara,
  targetChara: Chara,
) {

  const backMovementDuration = 300 / state.options.speed;
  // The actual "strike" happens at the end of the forward movement
  const forwardMovementDuration = 200 / state.options.speed;

  const returnMovementDuration = 300 / state.options.speed;

  const backDistance = 32;
  const forwardDistance = backDistance * 2;

  const directionVector = Phaser.Math.Angle.BetweenPoints(
    activeChara.sprite,
    targetChara.sprite
  );
  const { x, y } = activeChara.sprite;

  await tweenSequence(scene,
    [{
      targets: activeChara.sprite,
      x: x - Math.cos(directionVector) * backDistance,
      y: y - Math.sin(directionVector) * backDistance,
      duration: backMovementDuration,
    },
    {
      targets: activeChara.sprite,
      x: x + Math.cos(directionVector) * forwardDistance,
      y: y + Math.sin(directionVector) * forwardDistance,
      duration: forwardMovementDuration,
    },
    {
      targets: activeChara.sprite,
      x,
      y,
      duration: returnMovementDuration,
    }
    ]);

}


export default processTick;