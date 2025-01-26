import { emit, signals, } from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { State, getState, getUnit } from "../../Models/State";
import { Unit } from "../../Models/Unit";
import { Chara } from "../../Systems/Chara/Chara";
import { delay, tween, tweenSequence } from "../../Utils/animation";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { lookupAIPAth } from "./Systems/Pathfinding";
import { getJob } from "../../Models/Job";
import { asVec2, Vec2 } from "../../Models/Geometry";
import { HALF_TILE_HEIGHT, HALF_TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "./constants";
import { getSkill } from "../../Models/Skill";

const processTick = async (scene: BattlegroundScene) => {

  emit(signals.TURN_START)

  const state = getState();

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

  console.log("start combat phase")
  await combatStep(scene, state);
  console.log("ended combat phase")

  state.gameData.tick++;
  emit(signals.TURN_END)

  scene.displayOrderEmotes();
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
  const [next] = unit.path;

  if (!next) {
    console.warn("invalid state :: no next cell to move to", unit.id);
    return;
  }

  const unitChara = scene.getChara(unit.id);

  await panTo(scene, asVec2(unitChara.sprite));

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
        target: chara.unit.id,
        type: "skill-on-unit",
        skill: "attack",
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
    console.log(unit.job, ":: triggered attack of opportunity by ", closeEnemies.map(u => u.unit.job));

    for (const enemy of closeEnemies) {
      console.log(enemy.unit.job, ":: attacking because of attack of opportunity -> ", unit.job);

      await popText(scene, "Attack of Opportunity!", enemy.unit.id);

      await cast(scene, state, enemy.unit, "attack", unit.id);
      emit(signals.HIDE_EMOTE, enemy.unit.id);
      if (unit.hp <= 0) {
        console.log(unit.job, ":: unit has been killed by attack of opportunity, skipping movement phase");
        return;
      } else {
        console.log(unit.job, ":: unit has survived attack of opportunity, continuing movement phase");
      }
    }

  }

  emit(signals.MOVE_UNIT_INTO_CELL_START, unit.id, next);

  const audio = scene.sound.add("audio/chip-lay-3")
  audio.volume = state.options.soundVolume;
  audio.play();

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

function checkHeals(
  state: State,
  scene: BattlegroundScene,
): (unit: Unit) => void {
  return async (unit) => {

    // TODO: make units have a "path", and "order" have a unit/cell target
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

    // units that already have an order can skip this step
    if (unit.order.type === "skill-on-unit") {
      const maybeTarget = scene.getChara(unit.order.target);
      if (maybeTarget && maybeTarget.unit.hp > 0) {

        const distance = Phaser.Math.Distance.BetweenPoints(unit.position, maybeTarget.unit.position);

        if (distance === 1) {
          console.log("target is alive and in range, skipping agroo", unit.job);
          return;
        } else {
          console.log(unit.job, ": target is alive but out of range, will chase target");
          const path = await lookupAIPAth(scene, unit.id, unit.position, maybeTarget.unit.position);
          if (path.length > 0) {
            emit(signals.PATH_FOUND, unit.id, path);
            return;
          } else {
            console.warn("path not found, will wait for next turn", unit.job);
            return;
          }
        }
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

    if (distance === 1) {
      if (unit.order.type === "move" && unit.path.length > 0) {

        const maybeBlocker = scene.getCharaAt(unit.path[0]);
        if (!maybeBlocker) {
          console.log("unit can attack but is moving and is not blocked", unit.job)
          return;
        }

      }
      unit.order = {
        type: "skill-on-unit",
        skill: "attack",
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

        // TODO: use skill range to determine if unit can attack on melee
        if ([
          "monk", "soldier", "orc"
        ].includes(unit.job)) await checkAgroo(state, scene)(unit);
        else
          await checkHeals(state, scene)(unit);

        // TODO: maybe create type "unit with skill" to avoid this redundant check
        if (unit.order.type !== "skill-on-unit") return async () => {
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
  skillId: string,
  targetId: string,
) {

  console.log(unit.job, " :: casting skill -> ", skillId);
  const activeChara = scene.getCharaAt(unit.position)

  const targetUnit = getUnit(state)(targetId);

  const targetChara = scene.getChara(targetId);

  if (!activeChara) {
    throw new Error(
      "no active unit\n" +
      JSON.stringify({ activeChara }, null, 2)
    )
  }

  const skill = getSkill(skillId)

  panTo(scene, asVec2(activeChara.sprite));

  //@ts-ignore
  scene.children.bringToTop(activeChara.group);

  //const damageDisplay = createDamageDisplay(scene, targetUnit);

  // is target still alive?
  if (targetUnit.hp <= 0) {
    console.log("target is dead", targetUnit.id);
    emit(signals.MAKE_UNIT_IDLE, unit.id);
    if (unit.force === FORCE_ID_PLAYER) {
      emit(signals.DISPLAY_EMOTE, unit.id, "question-emote");
    }
    await delay(scene, 1000 / state.options.speed);
    emit(signals.HIDE_EMOTE, unit.id);
    return;
  }

  if (skillId === "attack") {

    await popText(scene, "Attack!", unit.id);
    // make the unit move backwards, then forwards to attack
    bashCardAnimation(scene, state, activeChara, targetUnit);

    //await delay(scene, 500 / state.options.speed);

    popText(scene, skill.name, activeChara.unit.id);

    await slashAnimation(scene, activeChara, targetChara, skill.power);

    // await delay(scene, 2000);

    // await tween(scene, {
    //   targets: damageDisplay,
    //   scale: 0.35,
    //   duration: 300 / state.options.speed,
    //   ease: "Bounce.easeOut",
    // });

    console.log("will attack", targetUnit.job, targetUnit.hp);

    emit(
      signals.DAMAGE_UNIT,
      targetUnit.id,
      skill.power,
    );

    // await tween(scene, {
    //   targets: slash,
    //   alpha: 0,
    //   duration: 700 / state.options.speed,
    // });

  }

  if (skillId === "heal") {

    console.log("will heal", unit.job, "->", targetUnit.job);

    await popText(scene, "Heal", unit.id)

    const audio = scene.sound.add("audio/curemagic");
    audio.volume = state.options.soundVolume;
    audio.play();

    const sprite = scene.add.sprite(targetChara.sprite.x, targetChara.sprite.y, "pipo-light-pillar").play("pipo-light-pillar");
    sprite.setScale(0.5).setOrigin(0.5, 0.5).setAlpha(0)
    tween(scene, {
      targets: sprite,
      alpha: 0.5,
      duration: 500 / state.options.speed,
    })

    popText(scene, "Healed (50)", targetUnit.id)

    emit(signals.HEAL_UNIT, targetUnit.id, 50); // TODO: use skill's stats

    await delay(scene, 500 / state.options.speed);

    await tween(scene, {
      targets: sprite,
      alpha: 0,
      duration: 500 / state.options.speed,
    })

    sprite.destroy();

  }
}

async function slashAnimation(
  scene: BattlegroundScene,
  activeChara: Chara,
  targetChara: Chara,
  damage: number,
) {


  const state = getState();
  const slash = scene.add
    .sprite(0, 0, "cethiel-slash")
    .play("cethiel-slash")
    .setScale(0.7);

  slash.x = targetChara.sprite.x + HALF_TILE_WIDTH;
  slash.y = targetChara.sprite.y - HALF_TILE_HEIGHT;

  const audio = scene.sound.add("audio/sword2");
  audio.volume = state.options.soundVolume * 2;
  audio.play();

  scene.time.addEvent({
    delay: 250 / state.options.speed,
    callback: () => {
      popText(scene, damage.toString(), targetChara.unit.id);

      // make target unit flash
      tween(scene, {
        targets: targetChara.sprite,
        alpha: 0.5,
        duration: 100 / state.options.speed,
        yoyo: true,
        repeat: 4,
      });

    }
  })

  await tween(scene, {
    targets: slash,
    x: targetChara.sprite.x,
    y: targetChara.sprite.y,
    duration: 500 / state.options.speed,
    onComplete: () => {
      slash.destroy();
    }
  });

}

async function popText(scene: BattlegroundScene, text: string, targetId: string) {

  const chara = scene.getChara(targetId);
  const popText = scene.add.text(chara.sprite.x, chara.sprite.y, text, {
    fontSize: "24px",
    color: "#ffffff",
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
  }).setOrigin(0.5, 0.5);

  await tween(scene, {
    targets: popText,
    alpha: 0,
    y: chara.sprite.y - 24,
    duration: 2000 / scene.state.options.speed,
    ease: "Expo.easeOut",
  });

  popText.destroy();
}

function createDamageDisplay(scene: BattlegroundScene, targetUnit: Unit) {

  const targetChara = scene.getChara(targetUnit.id);

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
  targetUnit: Unit,
) {

  const targetChara = scene.getChara(targetUnit.id);

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
      onComplete: () => {
        // const audio = scene.sound.add("audio/punch1");
        // audio.volume = state.options.soundVolume;
        // audio.play();
      }
    },
    {
      targets: activeChara.sprite,
      x,
      y,
      duration: returnMovementDuration,
    }
    ]);

}

async function panTo(scene: BattlegroundScene, vec: Vec2) {
  const state = getState();

  scene.cameras.main.pan(vec.x, vec.y, 500 / state.options.speed, "Linear", true);

  await delay(scene, 500 / state.options.speed);
}

export default processTick;