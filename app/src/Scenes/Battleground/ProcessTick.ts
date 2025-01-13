import { Vec2 } from "../../Models/Geometry";
import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";
import { Chara } from "../../Systems/Chara/Chara";
import { delay, tween, tweenSequence } from "../../Utils/animation";

const processTick = async (scene: BattlegroundScene) => {
  const state = getState();

  console.log("start movement phase")
  await moveStep(scene, state);
  console.log("ended movement phase")

  console.log("start combat phase")
  await combatStep(scene, state);
  console.log("ended combat phase")

  state.gameData.tick++;
};


const performMovement = (
  scene: BattlegroundScene,
  moved: string[]
) => (
  { unit, path }: { unit: Unit, path: Vec2[] },
) => async () => {

  moved.push(unit.id);
  const [next] = path;

  // validate path.
  // 1 - is the path occupied by a unit? if so, stop the unit

  const chara = scene.getCharaAt(next);

  if (chara) {

    // 2 - is the unit an ally? if so, movement may continue if the ally is moving (unless it finishes on the same cell)

    console.log("has ally moved?", chara.unit.id, moved.includes(chara.unit.id));
    if (chara.unit.force === unit.force) {
      if (chara.unit.order.type !== "move") {

        console.log("unit is blocked because ally is not moving", chara.unit.job);

        emit(signals.MAKE_UNIT_IDLE, unit.id);
        return;
      }

      if (moved.includes(chara.unit.id)) {
        console.log("unit is blocked because ally has already moved", chara.unit.job);
        emit(signals.MAKE_UNIT_IDLE, unit.id);
        return;
      }
      // 3 - is the ally moving to an occupied cell? if so, stop the unit

      const [nextAllyStep] = chara.unit.order.path;
      const charaAtNextAllyStep = scene.getCharaAt(nextAllyStep);

      if (charaAtNextAllyStep && (charaAtNextAllyStep.unit.id !== unit.id)) {
        console.log("unit is blocked because ally will try moving into an occupied cell", chara.unit.job);
        emit(signals.MAKE_UNIT_IDLE, unit.id);
        return;
      }

    }

  }

  emit(signals.MOVE_UNIT_INTO_CELL, unit.id, next);

  await delay(scene, 500);

  unit.position = next;

  const remaining = path.slice(1);

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


async function runPromisesInOrder(promiseFunctions: (() => Promise<any>)[]) {
  for (const func of promiseFunctions) {
    await func();
  }
  return promiseFunctions
}


async function moveStep(scene: BattlegroundScene, state: State) {

  let moved: string[] = [];

  const unitsToMove = state.gameData.units
    .map(unit => {
      if (unit.order.type === "move")
        return { unit, path: unit.order.path }
      else
        return { unit, path: [] }
    })
    .filter(u => u.unit.order.type === "move")
    .map(performMovement(scene, moved));

  await runPromisesInOrder(unitsToMove);

}

async function combatStep(scene: BattlegroundScene, state: State) {

  const skills = state.gameData.units
    .filter(u => u.order.type === "skill")
    .map(unit => {

      // TODO: maybe create type "unit with skill" to avoid this redundant check
      if (unit.order.type !== "skill") throw new Error("unit order is not skill")

      const skill = unit.order.skill;
      console.log("casting skill", unit.id, skill);
      const target = unit.order.target;
      const activeChara = scene.getCharaAt(unit.position)

      const targetChara = scene.getCharaAt(target)

      if (!activeChara || !targetChara) {
        throw new Error(
          "no active or target unit\n" +
          JSON.stringify({ activeChara, targetChara }, null, 2)
        )
      }

      const container = createDamageDisplay(scene, targetChara);

      return async () => {

        // is target still alive?
        if (targetChara.unit.hp <= 0) {
          console.log("target is dead", targetChara.unit.id);
          emit(signals.MAKE_UNIT_IDLE, unit.id);
          emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
          await delay(scene, 1000);
          emit(signals.HIDE_EMOTE, unit.id);
          return;
        }


        // make the unit move backwards, then forwards to attack
        bashCardAnimation(scene, activeChara, targetChara);

        await delay(scene, 500);

        await tween(scene, {
          targets: container,
          scale: 0.35,
          duration: 300,
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
          duration: 700,
        });

        container.destroy(true);
      }
    });

  await runPromisesInOrder(skills)

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
  activeChara: Chara,
  targetChara: Chara,
) {

  const backMovementDuration = 300;
  // The actual "strike" happens at the end of the forward movement
  const forwardMovementDuration = 200;

  const returnMovementDuration = 300;

  const backDistance = 32;
  const forwardDistance = backDistance;

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