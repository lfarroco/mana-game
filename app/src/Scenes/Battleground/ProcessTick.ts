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
} from "../../Models/Unit";
import { foldMap } from "../../Models/Signals";
import { State, getSquad, getState } from "../../Models/State";
import { getEnemiesNearby } from "./getEnemiesNearby";
import { getJob } from "../../Models/Job";

const TURNS_TO_MOVE = 3;
const processTick = (scene: BattlegroundScene) => {
  // apply user-defined status changes before starting (eg. moving)

  // idea: each system should have their operations performed in a tick

  const state = getState();

  sequence(checkEnemiesInRange(scene));

  sequence(checkCombat(state));

  sequence(startMoving(state));

  moveStep(scene, state);

  sequence(checkDestroyed());

  sequence(checkIdle(scene));

  //sequence(updatePath(scene));

  sequence(cleanupEmotes(scene));

  state.gameData.forces.forEach((force) => {
    emit(signals.UPDATE_FORCE, { id: force.id, gold: force.gold + 100 });
  });
};

function moveStep(scene: BattlegroundScene, state: State) {
  return traverse_(
    getState()
      .gameData.squads.filter(s => isMoving(s.status))
      .sort((a, b) => a.agility - b.agility),
    (squad) => {
      const [next] = squad.path;

      const nextTile = scene.getTileAt(next);

      const [occupant] = state.gameData.squads
        .filter((s) => !isDestroyed(s.status))
        .filter((s) => eqVec2(s.position, next));

      if (squad.movementIndex < TURNS_TO_MOVE || occupant) {
        return [
          operations.SQUAD_WALKS_TOWARDS_CELL(
            squad.id,
            next,
            squad.movementIndex,
            TURNS_TO_MOVE
          ),
        ];
      }

      // perform the move
      // check if there's a city here
      // TODO: move this into "SQUAD_MOVED_INTO_CELL" event
      const maybeCity = getState().gameData.cities.find(
        (c) =>
          eqVec2(c.boardPosition, asVec2(nextTile)) && c.force !== squad.force
      );

      const maybeCaptureOp =
        maybeCity && maybeCity.force !== squad.force
          ? [operations.CAPTURE_CITY(maybeCity.id, squad.force)]
          : [];

      const [, ...path] = squad.path;

      return [
        operations.SQUAD_WALKS_TOWARDS_CELL(
          squad.id,
          next,
          squad.movementIndex,
          TURNS_TO_MOVE
        ),
        operations.SQUAD_LEAVES_CELL(squad.id, squad.position),
        operations.UPDATE_SQUAD(squad.id, { path }),
        operations.UPDATE_SQUAD(squad.id, { position: asVec2(nextTile) }),
        operations.SQUAD_MOVED_INTO_CELL(squad.id, asVec2(nextTile)),
        ...maybeCaptureOp,
      ].concat(
        // alternative: new event SQUAD_FINISHED_MOVING
        path.length === 0
          ? [operations.UPDATE_SQUAD(squad.id, { status: UNIT_STATUS.IDLE() })]
          : []
      );
    }
  );
}

function checkEnemiesInRange(scene: BattlegroundScene): Operation[] {
  return foldMap(
    getState().gameData.squads.filter(
      (s) => s.status.type === UNIT_STATUS_KEYS.IDLE
    ),
    (squad) => {
      const enemiesNearby = getEnemiesNearby(squad);

      if (enemiesNearby.length > 0) {
        return [
          operations.UPDATE_SQUAD(squad.id, {
            status: UNIT_STATUS.ATTACKING(enemiesNearby[0].id),
          }),
        ];
      } else {
        return [];
      }
    }
  );
}

function checkCombat(state: State) {
  return foldMap(
    state.gameData.squads.filter((s) => isAttacking(s.status)),
    (squad) => {
      if (!isAttacking(squad.status)) return [];

      const job = getJob(squad.job);
      const { target } = squad.status;

      const enemy = getSquad(state)(target);

      const resume = () => {
        if (squad.path.length < 1) {
          return [
            operations.COMBAT_FINISHED(squad.id),
            operations.UPDATE_SQUAD(squad.id, {
              status: UNIT_STATUS.IDLE(),
            }),
          ];
        } else {
          return [
            operations.COMBAT_FINISHED(squad.id),
            operations.UPDATE_SQUAD(squad.id, {
              status: UNIT_STATUS.MOVING(squad.path[squad.path.length - 1]),
            }),
          ];
        }
      };
      const distance = distanceBetween(squad.position)(enemy.position);

      if (isDestroyed(enemy.status)) {
        return resume();
      } else if (job.attackType === "ranged" && distance > 3) {
        return resume();
      } else if (job.attackType === "melee" && distance > 1) {
        return resume();
      }


      const damage = job.attackPower + job.dices * 3;
      emit(signals.ATTACK, squad.id, enemy.id);
      const newStamina = enemy.hp - damage < 0 ? 0 : enemy.hp - damage;
      emit(signals.UPDATE_SQUAD, enemy.id, { hp: newStamina });

      return [operations.CREATE_EMOTE(squad.id, "combat-emote")];
    }
  );
}

export default processTick;

function checkDestroyed() {
  return foldMap(
    getState().gameData.squads.filter(
      (s) => s.status.type !== UNIT_STATUS_KEYS.DESTROYED
    ),
    (squad) => {
      return [
        ...squad.hp === 0 ? [operations.SQUAD_DESTROYED(squad.id)] : [],
        ...isAttacking(squad.status) && squad.hp === 0 ? [operations.COMBAT_FINISHED(squad.id)] : []
      ]
    }
  );
}

function checkIdle(scene: BattlegroundScene) {
  return foldMap(
    getState().gameData.squads.filter(
      (s) => s.status.type === UNIT_STATUS_KEYS.IDLE
    ),
    (squad) => {
      const chara = scene.getChara(squad.id);

      if (chara?.emote?.visible) {
        return [operations.REMOVE_EMOTE(squad.id)];
      }

      return [];
    }
  );
}

// this is just a crutch - the ideal is to call the removal when appropriate
function cleanupEmotes(scene: BattlegroundScene) {
  const state = getState();
  return foldMap(
    state.gameData.squads
      .filter((s) => s.status.type === UNIT_STATUS_KEYS.IDLE)
      .filter((s) => scene.getChara(s.id).emote?.visible),
    (squad) => [operations.REMOVE_EMOTE(squad.id)]
  );
}

// - checks for squads that are idle and have a path
// - sets their status to MOVING
function startMoving(state: State) {
  return foldMap(
    state.gameData.squads
      .filter((s) => s.status.type === UNIT_STATUS_KEYS.IDLE)
      .filter((s) => s.path.length > 0),
    (squad) => [
      operations.UPDATE_SQUAD(squad.id, {
        status: UNIT_STATUS.MOVING(squad.path[squad.path.length - 1]),
      }),
    ]
  );
}
