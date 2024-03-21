import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, signals } from "../../../Models/Signals";
import { asVec2, eqVec2, vec2 } from "../../../Models/Geometry";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { UNIT_STATUS, UNIT_STATUS_KEYS, isDestroyed } from "../../../Models/Unit";
import { getUnit, getState, State } from "../../../Models/State";
import { isInside } from "../../../Models/Geometry";
import { pingAt as pingAtLocation } from "./Ping";
import { getDirection } from "../../../Models/Direction";
import { getSkill } from "../../../Models/Skill";

export function makeMapInteractive(
  scene: BattlegroundScene,
  map: Phaser.Tilemaps.Tilemap,
  bgLayer: Phaser.Tilemaps.TilemapLayer
) {

  const state = getState()
  console.log("adding map listeners");
  //set camera bounds to the world
  scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  bgLayer?.setInteractive({ draggable: true });

  let startDrag = vec2(0, 0);
  let startScroll = vec2(0, 0);
  let selectionRect: Phaser.GameObjects.Graphics = scene.add.graphics();

  bgLayer.on(Phaser.Input.Events.POINTER_DOWN,
    (pointer: Phaser.Input.Pointer) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      // is middle mouse button
      if (pointer.buttons !== 4) return;

      startDrag = vec2(pointer.x, pointer.y);
      startScroll = vec2(
        scene.cameras.main.scrollX,
        scene.cameras.main.scrollY
      );
    }
  );

  bgLayer.on(Phaser.Input.Events.POINTER_MOVE,
    (pointer: Phaser.Input.Pointer) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      // is middle mouse button
      if (pointer.buttons !== 4) return;

      if (pointer.downTime < 100) return;

      const dx = startDrag.x - pointer.x;
      const dy = startDrag.y - pointer.y;
      const delta = Math.abs(dx + dy);

      if (delta < 10) return;

      scene.cameras.main.scrollX = startScroll.x + dx;
      scene.cameras.main.scrollY = startScroll.y + dy;
    }
  );

  bgLayer.on(Phaser.Input.Events.DRAG,
    (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      // is left mouse button
      if (pointer.buttons !== 1) return;

      if (!selectionRect) return;

      if (pointer.distance < 10) return;

      selectionRect.clear();
      selectionRect.lineStyle(2, 0x00ff00, 1);

      selectionRect.strokeRect(
        pointer.downX + scene.cameras.main.scrollX,
        pointer.downY + scene.cameras.main.scrollY,
        dragX,
        dragY
      );

      scene.charas.forEach((c) => c.sprite.setTint(0xffffff));
      scene.charas
        .filter((chara) =>
          isInside(
            pointer.downX + scene.cameras.main.scrollX,
            pointer.downY + scene.cameras.main.scrollY,
            dragX,
            dragY,
            chara.sprite.x,
            chara.sprite.y
          )
        )
        .forEach((chara) => {
          if (chara.force === FORCE_ID_PLAYER) chara.sprite.setTint(0x00ff00);
          else chara.sprite.setTint(0xff0000);
        });
    }
  );

  bgLayer.on(Phaser.Input.Events.DRAG_END,
    (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      const dragDistance = pointer.getDistance();
      if (dragDistance < 10) return;

      scene.charas.forEach((c) => c.sprite.setTint(0xffffff));

      const dx = dragX - pointer.downX + scene.cameras.main.scrollX;
      const dy = dragY - pointer.downY + scene.cameras.main.scrollY;

      // charas inside selection
      const charas = scene.charas
        .filter((c) => scene.getSquad(c.id).status.type !== UNIT_STATUS_KEYS.DESTROYED)
        .filter(c => scene.isTileVisible(getUnit(state)(c.id).position))
        .filter((chara) =>
          isInside(
            pointer.downX + scene.cameras.main.scrollX,
            pointer.downY + scene.cameras.main.scrollY,
            dx,
            dy,
            chara.sprite.x,
            chara.sprite.y
          )
        )

      const alliedCharas = charas.filter((c) => c.force === FORCE_ID_PLAYER);
      const enemyCharas = charas.filter((c) => c.force !== FORCE_ID_PLAYER);

      if (enemyCharas.length > 0 && alliedCharas.length > 0) {

        const ids = alliedCharas.map((c) => c.id)
        if (ids.length > 0)
          emit(
            signals.UNITS_SELECTED, ids
          );

      } else {

        const ids = charas.map((c) => c.id)

        if (ids.length > 0)
          emit(
            signals.UNITS_SELECTED, ids
          );

      }

      selectionRect.clear();
    }
  );

  bgLayer.on(Phaser.Input.Events.POINTER_UP,
    (pointer: Phaser.Input.Pointer, x: number, y: number) => {

      if (pointer.upElement?.tagName !== "CANVAS") return;

      // releasing the pointer after a drag also triggers a pointer up event, so we check the distance
      if (pointer.distance > 10) return

      const state = getState();

      const tile = bgLayer.getTileAtWorldXY(x, y);

      if (scene.isSelectingAttackTarget) {

        checkAttackTargetInCell(state, tile);

        return

      }

      if (scene.selectedSkillId) {
        useSkill(state, scene, tile, scene.selectedSkillId);
        return;
      }

      if (pointer.rightButtonReleased() || scene.isSelectingSquadMove) {

        issueMoveOrder(state, tile, scene, x, y);

        return

      }

      if (!scene.isSelectingSquadMove && !pointer.rightButtonReleased()) {

        selectEntitiesInTile(state, tile);

        return
      }

    }
  );
}

function useSkill(
  state: State,
  scene: BattlegroundScene,
  tile: Phaser.Tilemaps.Tile,
  skillId: string,
) {
  const unit = getUnit(state)(state.gameData.selectedUnits[0]);
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

function checkAttackTargetInCell(state: State, tile: Phaser.Tilemaps.Tile) {
  const enemy = state.gameData.units
    .find((unit) => eqVec2(unit.position, asVec2(tile)) && unit.force !== FORCE_ID_PLAYER);

  if (!enemy) return

  const unit = getUnit(state)(state.gameData.selectedUnits[0])

  const direction = getDirection(unit.position, enemy.position);

  emit(signals.SELECT_ATTACK_TARGET_DONE, enemy.id);
  emit(signals.UPDATE_UNIT, unit.id, { status: UNIT_STATUS.ATTACKING(enemy.id) });
  emit(signals.FACE_DIRECTION, unit.id, direction)
}

function selectEntitiesInTile(state: State, tile: Phaser.Tilemaps.Tile) {
  const unit = state.gameData.units
    .filter(unit => !isDestroyed(unit.status))
    .find((unit) => eqVec2(unit.position, asVec2(tile)));

  if (unit) {
    emit(signals.UNITS_SELECTED, [unit.id]);
    emit(signals.CITY_SELECTED, null);
  } else {

    const city = state.gameData.cities.find((city) => eqVec2(city.boardPosition, asVec2(tile)));

    if (city) {
      emit(signals.CITY_SELECTED, city.id);
      emit(signals.UNITS_SELECTED, []);
    }
  }
}

function issueMoveOrder(state: State, tile: Phaser.Tilemaps.Tile, scene: BattlegroundScene, x: number, y: number) {

  const isEnemySelected = state.gameData.selectedUnits.some((id) => {
    const unit = getUnit(state)(id);
    return unit.force !== FORCE_ID_PLAYER;
  });
  if (isEnemySelected) {
    scene.sound.play("ui/error");
    return;
  };


  state.gameData
    .selectedUnits
    .filter(unitId => {
      const unit = getUnit(state)(unitId);
      return !eqVec2(unit.position, asVec2(tile))
    })
    .forEach((unitId) => {
      emit(signals.SELECT_UNIT_MOVE_DONE, unitId, asVec2(tile));
    });

  pingAtLocation(scene, x, y);

}