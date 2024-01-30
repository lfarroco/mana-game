import { DIRECTIONS, Direction, getDirection } from "../../Models/Direction";
import { Vec2 } from "../../Models/Geometry";
import { signals, listeners } from "../../Models/Signals";
import BattlegroundScene from "../../Scenes/Battleground/BattlegroundScene";
import { Chara, EMOTE_SCALE } from "./Chara";
import { HALF_TILE_HEIGHT } from "../../Scenes/Battleground/constants";

type SpriteIndex = {
  [id: string]: {
    arrow: Phaser.GameObjects.Sprite,
    overlay: Phaser.GameObjects.Sprite
  }
}

export function init(scene: BattlegroundScene) {

  let spriteIndex: SpriteIndex = {}

  listeners([
    [
      signals.SQUAD_WALKS_TOWARDS_CELL,
      (squadId: string, next: Vec2, walked: number, total: number) => {

        const chara = scene.getChara(squadId);
        const squad = scene.getSquad(squadId);
        const direction = getDirection(squad.position, next);
        if (!spriteIndex[squadId]) {
          createArrow(direction, chara, spriteIndex);
        }

        const { overlay } = spriteIndex[squadId]

        const percentage = walked / total;

        if (walked === 0) createArrow(direction, chara, spriteIndex);

        if (direction === DIRECTIONS.right) {
          overlay.setCrop(0, 0, 32 * percentage, 32);
        } else if (direction === DIRECTIONS.left) {
          overlay.setCrop(32 * (1 - percentage), 0, 32, 32);
        } else if (direction === DIRECTIONS.down) {
          overlay.setCrop(0, 0, 32, 32 * percentage);
        } else if (direction === DIRECTIONS.up) {
          overlay.setCrop(0, 32 * (1 - percentage), 32, 32);
        }
      },
    ],
    [
      signals.SQUAD_FINISHED_MOVE_ANIM,
      (squadId: string) => {
        const squad = scene.getSquad(squadId);

        const [next] = squad.path;


        if (!next) removeSprites(spriteIndex, squadId);
      },
    ],
  ]);
}
export function createArrow(direction: Direction, chara: Chara, index: SpriteIndex) {

  if (index[chara.id])
    removeSprites(index, chara.id)

  if (direction === DIRECTIONS.right) {
    createSprites(chara, index, "arrow-right-emote")
  } else if (direction === DIRECTIONS.left) {
    createSprites(chara, index, "arrow-left-emote");
  } else if (direction === DIRECTIONS.down) {
    createSprites(chara, index, "arrow-bottom-emote");
  } else if (direction === DIRECTIONS.up) {
    createSprites(chara, index, "arrow-top-emote");
  }
}

function createSprites(chara: Chara, index: SpriteIndex, key: string) {

  const arrow = chara.sprite.scene.add
    .sprite(chara.sprite.x, chara.sprite.y - HALF_TILE_HEIGHT, key)
    .setScale(EMOTE_SCALE);

  arrow.anims.play(key);

  const overlay = chara.sprite.scene.add
    .sprite(chara.sprite.x, chara.sprite.y - HALF_TILE_HEIGHT, key)
    .setScale(EMOTE_SCALE);
  overlay.anims.play(key);
  overlay.setCrop(0, 0, 0, 0);
  overlay.setTint(65280);
  overlay.anims.play(key)

  const follow = () => {
    arrow.x = chara.sprite.x;
    arrow.y = chara.sprite.y - HALF_TILE_HEIGHT;
    overlay.x = chara.sprite.x;
    overlay.y = chara.sprite.y - HALF_TILE_HEIGHT;
  };
  chara.sprite.scene.events.on("update", follow);
  chara.sprite.once("destroy", () => {
    chara.sprite.scene.events.off("update", follow);
  });

  chara.group?.add(arrow);
  chara.group?.add(overlay);

  index[chara.id] = { arrow, overlay }
}

export function removeSprites(spriteIndex: SpriteIndex, squadId: string) {
  const sprites = spriteIndex[squadId]
  sprites.arrow.destroy();
  sprites.overlay.destroy();

  delete spriteIndex[squadId]
}
