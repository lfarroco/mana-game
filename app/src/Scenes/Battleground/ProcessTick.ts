import { Vec2 } from "../../Models/Geometry";
import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState } from "../../Models/State";
import { Unit } from "../../Models/Unit";
import { Chara } from "../../Systems/Chara/Chara";
import { delay, tween, tweenSequence } from "../../Utils/animation";

const processTick = async (scene: BattlegroundScene) => {
  const state = getState();

  await moveStep(scene, state);

  await combatStep(scene, state);

  state.gameData.tick++;
};


const performMovement = (
  scene: BattlegroundScene
) => (
  { unit, path }: { unit: Unit, path: Vec2[] },
) => async () => {

  const [next] = path;

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

  const unitsToMove = state.gameData.units
    .map(unit => {
      if (unit.order.type === "move")
        return { unit, path: unit.order.path }
      else
        return { unit, path: [] }
    })
    .filter(u => u.unit.order.type === "move")
    .map(performMovement(scene));

  await runPromisesInOrder(unitsToMove);

}

async function combatStep(scene: BattlegroundScene, state: State) {

  const skills = state.gameData.units
    .filter(u => u.order.type === "skill")
    .map(unit => {

      // TODO: maybe create type "unit with skill" to avoid this redundant check
      if (unit.order.type !== "skill") throw new Error("unit order is not skill")

      const skill = unit.order.skill;
      console.log("casting skill", skill);
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
        // make the unit move backwards, then forwards to attack
        bashCardAnimation(scene, activeChara, targetChara);

        await delay(scene, 500);

        await tween(scene, {
          targets: container,
          scale: 0.35,
          duration: 300,
          ease: "Bounce.easeOut",
        });

        await tween(scene, {
          targets: container,
          alpha: 0,
          duration: 700,
        });

        container.destroy(true);

        unit.order = {
          type: "none"
        }
        // TODO: update target unit

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