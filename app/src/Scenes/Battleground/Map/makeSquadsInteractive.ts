import Phaser from "phaser";
import { BattlegroundScene } from "../BattlegroundScene";
import { getState } from "../../../Models/State";
import { signals, emit } from "../../../Models/Signals";
import { asVec2 } from "../../../Models/Geometry";
import { Chara } from "../../../Systems/Chara/Chara";

export function makeSquadsInteractive(
  scene: BattlegroundScene,
  charas: Chara[]
) {
  charas.forEach((entity) => {
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
        const tile = scene.getTileAtWorldXY(asVec2(chara.sprite));

        state.gameData.selectedUnits.forEach((sqdId) => {
          emit(signals.SELECT_SQUAD_MOVE_DONE, sqdId, asVec2(tile));
        });
      } else {
        emit(signals.UNITS_SELECTED, [chara.id]);
        emit(signals.CITIES_SELECTED, []);
      }
    }
  );
}
