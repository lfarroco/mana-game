import { DIRECTIONS, Direction, getDirection } from "../../Models/Direction";
import { Vec2 } from "../../Models/Geometry";
import { signals, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { Chara, EMOTE_SCALE } from "../../Components/MapChara";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";

export function init(scene: BattlegroundScene) {
  listeners([
    [
      signals.SQUAD_WALKS_TOWARDS_CELL,
      (squadId: string, next: Vec2, walked: number, total: number) => {
        const squad = scene.getSquad(squadId);

        const direction = getDirection(squad.position, next);

        const chara = scene.getChara(squadId);

        const percentage = walked / total;

        if (walked === 0) createArrow(direction, chara);

        if (direction === DIRECTIONS.right) {
          chara.movementArrowOverlay?.setCrop(0, 0, 32 * percentage, 32);
        } else if (direction === DIRECTIONS.left) {
          chara.movementArrowOverlay?.setCrop(32 * (1 - percentage), 0, 32, 32);
        } else if (direction === DIRECTIONS.down) {
          chara.movementArrowOverlay?.setCrop(0, 0, 32, 32 * percentage);
        } else if (direction === DIRECTIONS.up) {
          chara.movementArrowOverlay?.setCrop(0, 32 * (1 - percentage), 32, 32);
        }
      },
    ],
    [
      signals.SQUAD_FINISHED_MOVE_ANIM,
      (squadId: string) => {
        const squad = scene.getSquad(squadId);

        const chara = scene.getChara(squadId);

        const [next] = squad.path;

        if (!next) removeSprites(chara);
      },
    ],
  ]);
}
export function createArrow(direction: Direction, chara: Chara) {
  removeSprites(chara);

  if (direction === DIRECTIONS.right) {
    createSprites(chara, "arrow-right-emote");
  } else if (direction === DIRECTIONS.left) {
    createSprites(chara, "arrow-left-emote");
  } else if (direction === DIRECTIONS.down) {
    createSprites(chara, "arrow-bottom-emote");
  } else if (direction === DIRECTIONS.up) {
    createSprites(chara, "arrow-top-emote");
  }
}

function createSprites(chara: Chara, key: string) {
  const emote = chara.sprite.scene.add
    .sprite(chara.sprite.x, chara.sprite.y - HALF_TILE_HEIGHT, key)
    .setScale(EMOTE_SCALE);
  emote.anims.play(key);
  chara.movementArrow = emote;

  const overlay = chara.sprite.scene.add
    .sprite(chara.sprite.x, chara.sprite.y - HALF_TILE_HEIGHT, key)
    .setScale(EMOTE_SCALE);
  overlay.anims.play(key);
  overlay.setCrop(0, 0, 0, 0);
  overlay.setTint(65280);
  chara.movementArrowOverlay = overlay;

  const follow = () => {
    emote.x = chara.sprite.x;
    emote.y = chara.sprite.y - HALF_TILE_HEIGHT;
    overlay.x = chara.sprite.x;
    overlay.y = chara.sprite.y - HALF_TILE_HEIGHT;
  };
  chara.sprite.scene.events.on("update", follow);
  chara.sprite.once("destroy", () => {
    chara.sprite.scene.events.off("update", follow);
  });

  chara.group?.add(emote);
  chara.group?.add(overlay);
}

export function removeSprites(chara: Chara) {
  chara.movementArrow?.destroy();
  chara.movementArrowOverlay?.destroy();
}
