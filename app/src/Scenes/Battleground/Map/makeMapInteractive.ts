import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, signals } from "../../../Models/Signals";
import { Vec2, asVec2, eqVec2, vec2 } from "../../../Models/Geometry";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { Unit } from "../../../Models/Unit";
import { getUnit, State } from "../../../Models/State";
import { pingAt as pingAtLocation } from "./Ping";
import { getSkill } from "../../../Models/Skill";
import { onPointerMove } from "./Events/POINTER_MOVE";
import { onPointerUp } from "./Events/POINTER_UP";
import { onPointerDown } from "./Events/POINTER_DOWN";
import { City } from "../../../Models/City";

export function makeMapInteractive(
  scene: BattlegroundScene,
  map: Phaser.Tilemaps.Tilemap,
  bgLayer: Phaser.Tilemaps.TilemapLayer
) {

  console.log("adding map listeners");
  //set camera bounds to the world
  scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  bgLayer?.setInteractive({ draggable: true });

  let startScroll = vec2(0, 0);
  let pointerDownUnit: { unit: Unit | null } = { unit: null };

  onPointerDown(bgLayer, startScroll, scene, pointerDownUnit);

  onPointerMove(bgLayer, startScroll, scene, pointerDownUnit);

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

    emit(signals.SELECT_SKILL_TARGET_DONE, asVec2(tile));

  } else if (skill.targets === "enemy") {
    // todo: use "skill targets" to check if the skill can be used in a tile or unit
    const enemy = state.gameData.units.find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force !== FORCE_ID_PLAYER);

    if (!enemy) {
      console.log("no enemy in tile")
      return
    } // todo: error sound

    const distance = Phaser.Math.Distance.Between(unit.position.x, unit.position.y, enemy.position.x, enemy.position.y);

    if (distance > skill.range) return // todo: error sound

    emit(signals.SELECT_SKILL_TARGET_DONE, asVec2(tile));

  }

}

export function selectEntityInTile(state: State, tile: Vec2): [Unit | undefined, City | undefined] {
  const unit = state.gameData.units
    .filter(u => u.hp > 0)
    .find((unit) => eqVec2(unit.position, (tile)));

  const city = state.gameData.cities.find((city) => eqVec2(city.boardPosition, (tile)));

  if (unit) {
    emit(signals.UNIT_SELECTED, unit.id);
  } else {
    if (city) {
      emit(signals.CITY_SELECTED, city.id);
    }
  }

  return [unit, city]
}

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
