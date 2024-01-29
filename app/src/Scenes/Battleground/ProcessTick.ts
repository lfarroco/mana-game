import { asVec2, eqVec2 } from "../../Models/Geometry";
import {
  Operation,
  emit,
  sequence,
  events,
  operations,
  traverse_,
} from "../../Models/Signals";
import { BattlegroundScene } from "./BattlegroundScene";
import { getDirection } from "../../Models/Direction";
import { UNIT_STATUS, Unit, UnitStatus } from "../../Models/Unit";
import { TURN_DURATION } from "../../config";
import { foldMap } from "../../Models/Signals";
import { State, getState } from "../../Models/State";
import { getEnemiesNearby } from "./getEnemiesNearby";

const TURNS_TO_MOVE = 3;
const processTick = (scene: BattlegroundScene) => {
  // apply user-defined status changes before starting (eg. moving)

  // idea: each system should have their operations performed in a tick

  const state = getState();

  sequence(checkEnemiesInRange(scene));

  sequence(checkCombat(scene));

  sequence(startMoving(state));

  moveStep(scene);

  sequence(checkDestroyed(scene));

  sequence(checkIdle(scene));

  sequence(updatePath(scene));

  sequence(cleanupEmotes(scene));

  state.gameData.forces.forEach(force => {
    emit(events.UPDATE_FORCE, { id: force.id, gold: force.gold + 100 })
  })

  // TODO: face direction
};

function moveStep(scene: BattlegroundScene) {
  return traverse_(
    getState().gameData.squads
      .filter((s) => s.status === UNIT_STATUS.MOVING)
      .sort((a, b) => a.agility - b.agility),
    (squad) => {
      const chara = scene.getChara(squad.id);

      const [next] = squad.path;

      const nextTile = scene.getTileAt(next);

      const direction = getDirection(squad.position, next);

      // TODO: move this into a separate system (SQUAD_WALKS_TOWARDS_CELL)
      const directionOps =
        squad.movementIndex === 0
          ? // this will not be necessary if we have a direction check each tick
          [operations.FACE_DIRECTION(squad.id, direction)]
          : [];

      const [occupant] = getState().gameData.squads
        .filter((s) => s.status !== UNIT_STATUS.DESTROYED)
        .filter((s) => eqVec2(s.position, next));

      if (squad.movementIndex < TURNS_TO_MOVE || occupant) {
        return [
          operations.SQUAD_WALKS_TOWARDS_CELL(
            squad.id,
            next,
            squad.movementIndex,
            TURNS_TO_MOVE
          ),
          ...directionOps,
        ];
      }

      // perform the move
      // check if there's a city here
      // TODO: move this into "SQUAD_MOVED_INTO_CELL" event
      const maybeCity = getState().gameData.cities.find(
        (c) => eqVec2(c.boardPosition, asVec2(nextTile)) && c.force !== squad.force
      );

      const maybeCaptureOp =
        maybeCity && maybeCity.force !== squad.force
          ? [operations.CAPTURE_CITY(maybeCity.id, squad.force)]
          : [];

      scene.tweens.add({
        targets: chara.sprite,
        x: nextTile.getCenterX(),
        y: nextTile.getCenterY(),
        duration: TURN_DURATION / (2 * getState().options.speed),
        yoyo: false,
        ease: "Sine.easeInOut",
        onComplete: () => {
          emit(events.SQUAD_FINISHED_MOVE_ANIM, squad.id);
        },
      });

      const [, ...path] = squad.path;

      return [
        ...directionOps,
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
          ? [operations.UPDATE_SQUAD(squad.id, { status: UNIT_STATUS.IDLE })]
          : []
      );
    }
  );
}

function checkEnemiesInRange(scene: BattlegroundScene): Operation[] {
  return foldMap(
    getState().gameData.squads.filter((s) => s.status === UNIT_STATUS.IDLE),
    (squad) => {
      const enemiesNearby = getEnemiesNearby(squad);


      if (enemiesNearby.length > 0) {
        return [
          operations.UPDATE_SQUAD(squad.id, {
            status: {
              ...UNIT_STATUS.ATTACKING,
              target: enemiesNearby[0].id,
            } as UnitStatus
          }),
        ];
      } else {
        return [];
      }
    }
  );
}

function checkCombat(scene: BattlegroundScene) {
  return foldMap(
    getState().gameData.squads
      .filter((s) => s.status.type === UNIT_STATUS.ATTACKING.type),
    (squad) => {
      const enemiesNearby = getEnemiesNearby(squad);

      if (enemiesNearby.length > 0) {
        const enemy = enemiesNearby[0];

        attack(squad, enemy);

        return [operations.CREATE_EMOTE(squad.id, "combat-emote")];
      } else if (squad.path.length === 0) {
        return [
          operations.UPDATE_SQUAD(squad.id, {
            status: UNIT_STATUS.IDLE,
          }),
        ];
      } else {
        return [
          operations.UPDATE_SQUAD(squad.id, {
            status: UNIT_STATUS.MOVING,
          }),
        ];
      }
    }
  );
}

export default processTick;

function attack(squad: Unit, enemy: Unit) {
  emit(events.ATTACK, squad.id, enemy.id);
  const newStamina = enemy.hp - 9 < 0 ? 0 : enemy.hp - 9;
  emit(events.UPDATE_SQUAD, enemy.id, { hp: newStamina });
}

function checkDestroyed(scene: BattlegroundScene) {
  return foldMap(
    getState().gameData.squads.filter((s) => s.status !== UNIT_STATUS.DESTROYED),
    (squad) => {
      if (squad.hp === 0) {
        return [operations.SQUAD_DESTROYED(squad.id)];
      }
      return [];
    }
  );
}

function checkIdle(scene: BattlegroundScene) {
  return foldMap(
    getState().gameData.squads.filter((s) => s.status === UNIT_STATUS.IDLE),
    (squad) => {
      const chara = scene.getChara(squad.id);

      if (chara?.emote?.visible) {
        return [operations.REMOVE_EMOTE(squad.id)];
      }

      return [];
    }
  );
}

function updatePath(scene: BattlegroundScene) {
  return foldMap(
    getState().gameData.squads.filter((s) => s.status === UNIT_STATUS.MOVING),
    (squad) => [
      operations.LOOKUP_PATH(
        squad.id,
        squad.position,
        squad.path[squad.path.length - 1]
      ),
    ]
  );
}

// this is just a crutch - the ideal is to call the removal when appropriate
function cleanupEmotes(scene: BattlegroundScene) {
  const state = getState()
  return foldMap(
    state.gameData.squads
      .filter((s) => s.status === UNIT_STATUS.IDLE)
      .filter((s) => scene.getChara(s.id).emote?.visible),
    (squad) => [operations.REMOVE_EMOTE(squad.id)]
  );
}

// - checks for squads that are idle and have a path
// - sets their status to MOVING
function startMoving(state: State) {
  return foldMap(
    state.gameData.squads
      .filter((s) => s.status === UNIT_STATUS.IDLE)
      .filter((s) => s.path.length > 0),
    (squad) => [
      operations.UPDATE_SQUAD(squad.id, { status: UNIT_STATUS.MOVING }),
    ]
  );
}
