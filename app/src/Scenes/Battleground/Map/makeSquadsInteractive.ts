import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../../../Models/State";
import { events, emit } from "../../../Models/Signals";
import { asVec2 } from "../../../Models/Geometry";
import { Chara } from "../../../Components/MapChara";

export function makeSquadsInteractive(
  scene: BattlegroundScene,
  entities: Chara[]
) {
  entities.forEach((entity) => {
    makeSquadInteractive(entity, scene);
  });
}

export function makeSquadInteractive(chara: Chara, scene: BattlegroundScene) {
  chara.sprite.setInteractive();
  chara.sprite.on(
    Phaser.Input.Events.POINTER_UP,
    (pointer: Phaser.Input.Pointer, x: number, y: number) => {
      const state = getState();

      if (pointer.upElement.tagName !== "CANVAS") return;

      if (!chara.sprite.active) return;

      if (
        state.gameData.selectedUnits.length > 0 &&
        (scene.isSelectingSquadMove || pointer.rightButtonReleased())
      ) {
        const tile = scene.layers?.background.getTileAtWorldXY(
          chara.sprite.x,
          chara.sprite.y
        );
        if (!tile) return;

        state.gameData.selectedUnits.forEach((sqdId) => {
          emit(events.SELECT_SQUAD_MOVE_DONE, sqdId, asVec2(tile));
        });
      } else {
        emit(events.UNITS_SELECTED, [chara.id]);
        emit(events.CITIES_SELECTED, []);
      }
    }
  );
}
