import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { emit, events } from "../../../Models/Signals";
import { asVec2, vec2 } from "../../../Models/Geometry";
import { FORCE_ID_PLAYER } from "../../../Models/Force";
import { UNIT_STATUS } from "../../../Models/Squad";

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

  bgLayer.on(
    Phaser.Input.Events.POINTER_DOWN,
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

  bgLayer.on(
    Phaser.Input.Events.POINTER_MOVE,
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

  let selectionRect: Phaser.GameObjects.Graphics = scene.add.graphics();

  bgLayer.on(
    Phaser.Input.Events.DRAG,
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

  bgLayer.on(
    Phaser.Input.Events.DRAG_END,
    (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      const dragDistance = pointer.getDistance();
      if (dragDistance < 10) return;

      scene.charas.forEach((c) => c.sprite.setTint(0xffffff));

      const dx = dragX - pointer.downX + scene.cameras.main.scrollX;
      const dy = dragY - pointer.downY + scene.cameras.main.scrollY;

      // charas inside selection
      const charas = scene.charas
        .filter((c) => scene.getSquad(c.id).status !== UNIT_STATUS.DESTROYED)
        .filter((chara) =>
          isInside(
            pointer.downX + scene.cameras.main.scrollX,
            pointer.downY + scene.cameras.main.scrollY,
            dx,
            dy,
            chara.sprite.x,
            chara.sprite.y
          )
        );

      const cities = scene.cities.filter((city) =>
        isInside(
          pointer.downX + scene.cameras.main.scrollX,
          pointer.downY + scene.cameras.main.scrollY,
          dx,
          dy,
          city.sprite.x,
          city.sprite.y
        )
      );

      if (charas.length > 0)
        emit(
          events.UNITS_SELECTED,
          charas.map((c) => c.id)
        );

      if (cities.length > 0)
        emit(
          events.CITIES_SELECTED,
          cities.map((c) => c.city.id)
        );

      selectionRect.clear();
    }
  );

  bgLayer.on(
    Phaser.Input.Events.POINTER_UP,
    (pointer: Phaser.Input.Pointer, x: number, y: number) => {
      if (pointer.upElement?.tagName !== "CANVAS") return;

      if (
        scene.state.gameData.selectedUnits.length > 0 &&
        (pointer.rightButtonReleased() || scene.isSelectingSquadMove)
      ) {
        const tile = bgLayer.getTileAtWorldXY(x, y);

        scene.state.gameData.selectedUnits.forEach((sqdId) => {
          emit(events.SELECT_SQUAD_MOVE_DONE, sqdId, asVec2(tile));
        });
      }
    }
  );
}
function isInside(
  x: number,
  y: number,
  w: number,
  h: number,
  px: number,
  py: number
): boolean {
  // sometimes width and height can be negative
  // we need our rect to always be positive so that the collision may work

  return new Phaser.Geom.Rectangle(
    w < 0 ? x + w : x,
    h < 0 ? y + h : y,
    Math.abs(w),
    Math.abs(h)
  ).contains(px, py);
}
