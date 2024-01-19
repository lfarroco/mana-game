import { Chara } from "../../Components/MapChara";
import { Direction, getDirection } from "../../Models/Direction";
import { eqVec2, Vec2 } from "../../Models/Geometry";
import { events, listeners } from "../../Models/Signals";
import { Unit } from "../../Models/Squad";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      events.SQUAD_WALKS_TOWARDS_CELL,
      (squadId: string, next: Vec2, walked: number, _total: number) => {
        if (walked > 0) return;

        const squad = scene.getSquad(squadId);

        const chara = scene.getChara(squadId);

        const direction = getDirection(squad.position, next);

        faceDirection(direction, chara);
      },
    ],
    [
      events.SQUAD_FINISHED_MOVE_ANIM,
      (squadId: string) => {
        const squad = scene.getSquad(squadId);

        const chara = scene.getChara(squadId);

        const next = squad.path[0];

        if (next && squad.path.length > 1) {
          const nextDirection = getDirection(squad.position, next);

          faceDirection(nextDirection, chara);
        }
      },
    ],
    [
      events.ATTACK,
      (squadId: string, targetId: string) => {
        const squad = scene.getSquad(squadId);

        const chara = scene.getChara(squadId);

        const target = scene.getSquad(targetId);

        const direction = getDirection(squad.position, target.position);

        faceDirection(direction, chara);
      },
    ],
    [
      events.CHANGE_DIRECTION,
      (squadId: string, vec: Vec2) => {
        const squad = scene.getSquad(squadId);

        const chara = scene.getChara(squadId);

        const direction = getDirection(squad.position, vec);

        faceDirection(direction, chara);
      },
    ],
  ]);
}

// TODO: split facing from the arrow emote
function faceDirection(direction: Direction, chara: Chara) {
  chara.sprite.play(chara.job + "-walk-" + direction, true);
}

