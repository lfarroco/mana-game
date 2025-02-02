import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, signals } from "../../../Models/Signals";
import { asVec2, eqVec2, vec2 } from "../../../Models/Geometry";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { Unit } from "../../../Models/Unit";
import { getUnit } from "../../../Models/State";
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

  let startScroll = vec2(0, 0);
  let pointerDownUnit: { unit: Unit | null } = { unit: null };

  onPointerDown(bgLayer, startScroll, scene, pointerDownUnit);

  onPointerMove(bgLayer, startScroll, scene, pointerDownUnit);

  onPointerUp(bgLayer, scene, pointerDownUnit);
}

export function issueSkillCommand(
  scene: BattlegroundScene,
  unitId: string,
  tile: Phaser.Tilemaps.Tile,
  skillId: string,
) {

  const { state } = scene;

  const unit = getUnit(scene.state)(unitId);
  const skill = getSkill(skillId);

  if (skill.targets === "ally") {

    // todo: use "skill targets" to check if the skill can be used in a tile or unit
    const allyInTile = state.gameData.units.find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force === FORCE_ID_PLAYER);

    if (!allyInTile) return // todo: error sound

    // todo: use "skill requirements" to check if the skill can be used
    if (allyInTile.hp === allyInTile.maxHp) return false; // todo: error sound

    // todo: use "skill range" to check if the skill can be used

    // const distance = Phaser.Math.Distance.Between(unit.position.x, unit.position.y, allyInTile.position.x, allyInTile.position.y);

    // if (distance > skill.range) return false;// todo: error sound

    emit(signals.SELECT_SKILL_TARGET_DONE, asVec2(tile), allyInTile.id);

  } else if (skill.targets === "enemy") {
    // todo: use "skill targets" to check if the skill can be used in a tile or unit
    const enemy = state.gameData.units.find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force !== FORCE_ID_PLAYER);

    if (!enemy) {
      console.log("no enemy in tile")
      return
    } // todo: error sound

    // const distance = Phaser.Math.Distance.Between(unit.position.x, unit.position.y, enemy.position.x, enemy.position.y);

    // if (distance > skill.range) return // todo: error sound

    emit(signals.SELECT_SKILL_TARGET_DONE, asVec2(tile), enemy.id);

  }

}


