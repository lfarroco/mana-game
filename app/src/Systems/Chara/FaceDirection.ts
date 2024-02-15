import { Chara } from "./Chara";
import { Direction, getDirection } from "../../Models/Direction";
import { Vec2 } from "../../Models/Geometry";
import { signals, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      signals.UNIT_WALKS_TOWARDS_CELL,
      (unitId: string, next: Vec2, walked: number, _total: number) => {
        if (walked > 0) return;

        const unit = scene.getSquad(unitId);

        const chara = scene.getChara(unitId);

        const direction = getDirection(unit.position, next);

        faceDirection(direction, chara);
      },
    ],
    [
      signals.UNIT_FINISHED_MOVE_ANIM,
      (unitId: string) => {
        const unit = scene.getSquad(unitId);

        const chara = scene.getChara(unitId);

        const next = unit.path[0];

        if (next && unit.path.length > 1) {
          const nextDirection = getDirection(unit.position, next);

          faceDirection(nextDirection, chara);
        }
      },
    ],
    [
      signals.ATTACK_STARTED,
      (unitId: string, targetId: string) => {
        const unit = scene.getSquad(unitId);

        const chara = scene.getChara(unitId);

        const target = scene.getSquad(targetId);

        const direction = getDirection(unit.position, target.position);

        faceDirection(direction, chara);
      },
    ],
    [
      signals.CHANGE_DIRECTION,
      (unitId: string, vec: Vec2) => {
        const unit = scene.getSquad(unitId);

        const chara = scene.getChara(unitId);

        const direction = getDirection(unit.position, vec);

        faceDirection(direction, chara);
      },
    ],
    [
      signals.FACE_DIRECTION,
      (unitId: string, direction: Direction) => {
        const chara = scene.getChara(unitId);

        faceDirection(direction, chara);
      },
    ]
  ]);
}

// TODO: split facing from the arrow emote
function faceDirection(direction: Direction, chara: Chara) {
  chara.sprite.play(chara.job + "-walk-" + direction, true);
}

