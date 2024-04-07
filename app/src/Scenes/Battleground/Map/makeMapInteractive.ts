import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, signals } from "../../../Models/Signals";
import { Vec2, asVec2, eqVec2, vec2 } from "../../../Models/Geometry";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { UNIT_STATUS, Unit, isDestroyed } from "../../../Models/Unit";
import { getUnit, State } from "../../../Models/State";
import { pingAt as pingAtLocation } from "./Ping";
import { getDirection } from "../../../Models/Direction";
import { getSkill } from "../../../Models/Skill";
import { onPointerMove } from "./Events/POINTER_MOVE";
import { onPointerUp } from "./Events/POINTER_UP";
import { onPointerDown } from "./Events/POINTER_DOWN";

export function makeMapInteractive(
  scene: BattlegroundScene,
  map: Phaser.Tilemaps.Tilemap,
  bgLayer: Phaser.Tilemaps.TilemapLayer
) {

  console.log("adding map listeners");
  //set camera bounds to the world
  scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  bgLayer?.setInteractive({ draggable: true });

  let startDrag = vec2(0, 0);
  let startScroll = vec2(0, 0);
  let pointerDownUnit: { unit: Unit | null } = { unit: null };

  onPointerDown(bgLayer, startDrag, startScroll, scene, pointerDownUnit);

  onPointerMove(bgLayer, startDrag, startScroll, scene, pointerDownUnit);

  onPointerUp(bgLayer, scene, pointerDownUnit);
}

export function issueSkillCommand(
  state: State,
  scene: BattlegroundScene,
  tile: Phaser.Tilemaps.Tile,
  skillId: string,
) {

  if (!state.gameData.selectedUnit) return;
  const unit = getUnit(state)(state.gameData.selectedUnit);
  const skill = getSkill(skillId);

  if (skill.targets === "ally") {

    // todo: use "skill targets" to check if the skill can be used in a tile or unit
    const allyInTile = state.gameData.units.find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force === FORCE_ID_PLAYER);

    if (!allyInTile) return // todo: error sound

    // todo: use "skill requirements" to check if the skill can be used
    if (allyInTile.hp === allyInTile.maxHp) return // todo: error sound

    // todo: use "skill range" to check if the skill can be used

    const distance = Phaser.Math.Distance.Between(unit.position.x, unit.position.y, allyInTile.position.x, allyInTile.position.y);

    if (distance > skill.range) return // todo: error sound

    const direction = getDirection(unit.position, allyInTile.position);

    emit(signals.SELECT_SKILL_TARGET_DONE, unit.id, skill.id, asVec2(tile));
    emit(signals.FACE_DIRECTION, unit.id, direction);
    emit(signals.UPDATE_UNIT, unit.id, { status: UNIT_STATUS.CASTING(allyInTile.id, skill.id) });


  } else if (skill.targets === "enemy") {
    // todo: use "skill targets" to check if the skill can be used in a tile or unit
    const enemy = state.gameData.units.find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force !== FORCE_ID_PLAYER);

    if (!enemy) {
      console.log("no enemy in tile")
      return
    } // todo: error sound

    const distance = Phaser.Math.Distance.Between(unit.position.x, unit.position.y, enemy.position.x, enemy.position.y);

    if (distance > skill.range) return // todo: error sound

    const direction = getDirection(unit.position, enemy.position);

    emit(signals.SELECT_SKILL_TARGET_DONE, unit.id, skill.id, asVec2(tile));
    emit(signals.FACE_DIRECTION, unit.id, direction);
    emit(signals.UPDATE_UNIT, unit.id, { status: UNIT_STATUS.CASTING(enemy.id, skill.id) });

  }

}

export function checkAttackTargetInCell(state: State, tile: Phaser.Tilemaps.Tile) {
  const enemy = state.gameData.units
    .find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force !== FORCE_ID_PLAYER);

  if (!enemy) return

  if (!state.gameData.selectedUnit) return;

  const unit = getUnit(state)(state.gameData.selectedUnit)

  const direction = getDirection(unit.position, enemy.position);

  emit(signals.SELECT_ATTACK_TARGET_DONE, enemy.id);
  emit(signals.UPDATE_UNIT, unit.id, { status: UNIT_STATUS.ATTACKING(enemy.id) });
  emit(signals.FACE_DIRECTION, unit.id, direction)
}

export function selectEntityInTile(state: State, tile: Vec2) {
  const unit = state.gameData.units
    .filter(unit => !isDestroyed(unit.status))
    .find((unit) => eqVec2(unit.position, (tile)));

  if (unit) {
    emit(signals.UNIT_SELECTED, unit.id);
  } else {

    const city = state.gameData.cities.find((city) => eqVec2(city.boardPosition, (tile)));

    if (city) {
      emit(signals.CITY_SELECTED, city.id);
    }
  }
}

// TODO: refactor to accept unit id
export function issueMoveOrder(
  state: State,
  unitId: string,
  tile: Phaser.Tilemaps.Tile,
  scene: BattlegroundScene,
  x: number,
  y: number,
) {

  const unit = getUnit(state)(unitId);
  const isEnemy = unit.force !== FORCE_ID_PLAYER;
  if (isEnemy) {
    scene.sound.play("ui/error");
    return;
  };

  emit(signals.SELECT_UNIT_MOVE_DONE, unit.id, asVec2(tile));

  pingAtLocation(scene, x, y);

}
