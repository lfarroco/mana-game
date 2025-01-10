import { asVec2, distanceBetween, eqVec2 } from "../../Models/Geometry";
import {
  Operation,
  emit,
  sequence,
  signals,
  operations,
  traverse_,
} from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import {
  UNIT_STATUS_KEYS,
  UNIT_STATUS,
  isAttacking,
  isDestroyed,
  isMoving,
  isCasting,
  Unit,
} from "../../Models/Unit";
import { foldMap } from "../../Models/Signals";
import { State, getUnit, getState } from "../../Models/State";
import { getEnemiesNearby } from "./getEnemiesNearby";
import { getJob } from "../../Models/Job";
import { getSkill } from "../../Models/Skill";
import { TURN_DURATION } from "../../config";
import { renderEmotesForStatus } from "../../Systems/Chara/Emote";
import { getAllieNearby } from "./getAlliesNearby";

const TURNS_TO_MOVE = 3;
const processTick = (scene: BattlegroundScene) => {
  // apply user-defined status changes before starting (eg. moving)

  // idea: each system should have their operations performed in a tick

  const state = getState();

  // combat phase
  sequence(checkAlliesToSupport(scene, state));
  sequence(checkEnemiesInRange(scene));
  sequence(checkCombat(scene, state));
  // damage and heals are accumulated in the previous step
  // here we check if the total is less than 0 and change the status to 'destroyed'
  sequence(checkDestroyed());

  sequence(checkBoundedNumbers());
  sequence(cleanupPhase(state));

  // move phase
  sequence(startMoving(state));
  moveStep(scene, state);

  state.gameData.forces.forEach((force) => {
    //emit(signals.UPDATE_FORCE, { id: force.id, gold: force.gold + 100 });
  });

  renderEmotesForStatus(state);
};



function moveStep(scene: BattlegroundScene, state: State) {
  return traverse_(
    state
      .gameData.units.filter(s => isMoving(s.status))
      .sort((a, b) => a.agility - b.agility),
    (unit) => {
      const [next] = unit.path;

      const nextTile = scene.getTileAt(next);

      const [occupant] = state.gameData.units
        .filter((s) => !isDestroyed(s.status))
        .filter((s) => eqVec2(s.position, next));

      // if there's an enemy in the next tile, begin attack
      if (occupant && occupant.force !== unit.force) {
        // how to start an attack? by changing the status directly or by emitting an specific event?
        return [
          operations.UPDATE_UNIT(unit.id, {
            status: UNIT_STATUS.ATTACKING(occupant.id),
          }),
        ];
      }

      if (unit.movementIndex < TURNS_TO_MOVE) {
        return [
          operations.UNIT_WALKS_TOWARDS_CELL(
            unit.id,
            next,
            unit.movementIndex,
            TURNS_TO_MOVE
          ),
        ];
      }

      // if there's an ally there, wait

      if (occupant && occupant.force === unit.force)
        return []

      // check if there's a city here
      // TODO: move this into "UNIT_MOVED_INTO_CELL" event
      const maybeCity = getState().gameData.cities.find(
        (c) =>
          eqVec2(c.boardPosition, asVec2(nextTile)) && c.force !== unit.force
      );

      const maybeCaptureOp =
        maybeCity && maybeCity.force !== unit.force
          ? [operations.CAPTURE_CITY(maybeCity.id, unit.force)]
          : [];

      const [, ...path] = unit.path;

      return [
        operations.UNIT_WALKS_TOWARDS_CELL(
          unit.id,
          next,
          unit.movementIndex,
          TURNS_TO_MOVE
        ),
        operations.UNIT_LEAVES_CELL(unit.id, unit.position),
        operations.UPDATE_UNIT(unit.id, { path }),
        operations.UPDATE_UNIT(unit.id, { position: asVec2(nextTile) }),
        operations.UNIT_MOVED_INTO_CELL(unit.id, asVec2(nextTile), unit.position),
        ...maybeCaptureOp,
      ].concat(
        // alternative: new event UNIT_FINISHED_MOVING
        path.length === 0
          ? [operations.UPDATE_UNIT(unit.id, { status: UNIT_STATUS.IDLE() })]
          : []
      );
    }
  );
}

function checkEnemiesInRange(scene: BattlegroundScene): Operation[] {
  return foldMap(
    getState().gameData.units.filter(
      (s) => s.status.type === UNIT_STATUS_KEYS.IDLE
    ),
    (unit) => {
      const enemiesNearby = getEnemiesNearby(unit);

      if (enemiesNearby.length > 0) {
        return [
          operations.UPDATE_UNIT(unit.id, {
            status: UNIT_STATUS.ATTACKING(enemiesNearby[0].id),
          }),
        ];
      } else {
        return [];
      }
    }
  );
}

function checkAlliesToSupport(scene: BattlegroundScene, state: State): Operation[] {
  return foldMap(
    getState().gameData.units.filter(
      (s) => s.status.type === UNIT_STATUS_KEYS.IDLE
    ).filter(unit => {
      const job = getJob(unit.job);
      const skill = getSkill(job.skill);
      return skill && !skill.harmful
    }),
    (unit) => {
      const alliesNearby = getAllieNearby(unit);

      if (alliesNearby.length > 0) {

        const hurtAllies = alliesNearby.filter((a) => a.hp < a.maxHp);
        // pick the one with lower hp percentage

        if (hurtAllies.length === 0) {
          return [];
        }

        const target = hurtAllies
          .map(ally => [ally, ally.hp / ally.maxHp] as [Unit, number]).sort((a, b) => a[1] - b[1])[0][0];

        const job = getJob(unit.job);
        const skill = getSkill(job.skill);

        return [
          operations.UPDATE_UNIT(unit.id, {
            status: UNIT_STATUS.CASTING(target.id, skill.id),
          }),
        ];

      } else {
        return [];
      }
    }
  );
}

function processSkill(
  scene: BattlegroundScene,
  caster: Unit,
  state: State,
  skillId: string,
  targetId: string,
) {

  const stopCasting = (id: string) => [
    operations.UPDATE_UNIT(id, {
      status: UNIT_STATUS.IDLE(),
    }),
    // Hiding emotes should be the reaction of other actions
    //operations.HIDE_EMOTE(id),
    // TOOD: hide skill effect
  ];

  const skill = getSkill(skillId);

  const targetUnit = skill.targets === "ally" ?
    state.gameData.units.find((unit) => unit.id === targetId && unit.force === caster.force) :
    state.gameData.units.find((unit) => unit.id === targetId && unit.force !== caster.force);

  if (!targetUnit) {
    console.error("Invalid target for skill", skillId, targetId);
    return stopCasting(caster.id)
  }

  if (isDestroyed(targetUnit.status)) {
    return stopCasting(caster.id)
  }

  const distance = distanceBetween(caster.position)(targetUnit.position);

  if (distance > skill.range) {
    return stopCasting(caster.id)
  }

  if (skill.mana && caster.mana < skill.mana) {
    return stopCasting(caster.id)
  }

  // if (skill.emote)
  //   emit(signals.DISPLAY_EMOTE, caster.id, skill.emote);

  if (skill.targetEffect) {
    const sprite = scene.add.sprite(
      targetUnit.position.x * 64 + 32,
      targetUnit.position.y * 64 + 32,
      skill.targetEffect,
    );
    sprite.setAlpha(0.5);
    sprite.setOrigin(0.5, 0.5);
    sprite.anims.play(skill.targetEffect, true);
    scene.time.delayedCall(TURN_DURATION / 2, () => sprite.destroy());
  }

  const modifier = skill.harmful ? -1 : 1;

  const newHp = targetUnit.hp + skill.power * modifier;

  return [
    operations.UPDATE_UNIT(targetUnit.id, {
      hp: newHp,
    })
  ].concat(
    (skill.mana > 0 ? [
      operations.UPDATE_UNIT(caster.id, {
        mana: caster.mana - skill.mana,
      })
    ] : [])
  )

}

function checkCombat(scene: BattlegroundScene, state: State) {
  return foldMap(
    state.gameData.units.filter((s) => isAttacking(s.status) || isCasting(s.status)),
    (unit) => {
      if (!isAttacking(unit.status) && !isCasting(unit.status)) return [];

      if (isCasting(unit.status)) {
        const { skill, target } = unit.status;
        return processSkill(scene, unit, state, skill, target);
      }
      // TODO: make attacks be evaluated in the same way as skills

      const job = getJob(unit.job);
      const { target } = unit.status;

      const enemy = getUnit(state)(target);

      const exitCombat = () => {
        if (unit.path.length < 1) {
          return [
            operations.COMBAT_FINISHED(unit.id),
            operations.UPDATE_UNIT(unit.id, {
              status: UNIT_STATUS.IDLE(),
            }),
          ];
        } else {
          return [
            operations.COMBAT_FINISHED(unit.id),
            operations.UPDATE_UNIT(unit.id, {
              status: UNIT_STATUS.MOVING(unit.path[unit.path.length - 1]),
            }),
          ];
        }
      };
      const distance = distanceBetween(unit.position)(enemy.position);

      if (isDestroyed(enemy.status)) {
        return exitCombat();
      } else if (distance > job.attackRange) {
        return exitCombat();
      }

      const damage = job.attackPower + job.dices * 3;
      emit(signals.ATTACK, unit.id, enemy.id);
      const newHp = enemy.hp - damage;
      emit(signals.UPDATE_UNIT, enemy.id, { hp: newHp });

      return [];
    }
  );
}

export default processTick;

function checkDestroyed() {
  return foldMap(
    getState().gameData.units.filter(
      (s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED
    ),
    (unit) => {
      return [
        ...(unit.hp <= 0 ? [operations.UNIT_DESTROYED(unit.id)] : []),
        ...(isAttacking(unit.status) && unit.hp <= 0 ? [operations.COMBAT_FINISHED(unit.id)] : [])
      ]
    }
  );
}

function checkBoundedNumbers() {
  return foldMap(
    getState().gameData.units.filter(
      (s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED
    ),
    (unit) => {
      return [
        ...(unit.hp > unit.maxHp ? [operations.UPDATE_UNIT(unit.id, { hp: unit.maxHp })] : []),
        ...(unit.mana > unit.maxMana ? [operations.UPDATE_UNIT(unit.id, { mana: unit.maxMana })] : []),
        ...(unit.hp < 0 ? [operations.UPDATE_UNIT(unit.id, { hp: 0 })] : []),

      ]
    }
  );
}
function cleanupPhase(state: State) {
  return foldMap(
    state.gameData.units.filter(
      (s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED
    ),
    (unit) => {

      const isCasting = unit.status.type === UNIT_STATUS_KEYS.CASTING;
      if (isCasting && 'skill' in unit.status) {
        const skill = getSkill(unit.status.skill);

        const target = getUnit(state)(unit.status.target);

        if (!skill.harmful && target.hp === target.maxHp) {
          return [
            operations.UPDATE_UNIT(unit.id, {
              status: UNIT_STATUS.IDLE(),
            }),
          ];
        }

      }

      return []

    }
  );
}

// - checks for squads that are idle and have a path
// - sets their status to MOVING
function startMoving(state: State) {
  return foldMap(
    state.gameData.units
      .filter((s) => s.status.type === UNIT_STATUS_KEYS.IDLE)
      .filter((s) => s.path.length > 0),
    (unit) => [
      operations.UPDATE_UNIT(unit.id, {
        status: UNIT_STATUS.MOVING(unit.path[unit.path.length - 1]),
      }),
    ]
  );
}
