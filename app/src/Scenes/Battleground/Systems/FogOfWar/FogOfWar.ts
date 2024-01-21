import Phaser from "phaser";
import { BattlegroundScene } from "../../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../../Models/Force";
import { listeners, events } from "../../../../Models/Signals";
import { UNIT_STATUS } from "../../../../Models/Squad";
import { Vec2 } from "../../../../Models/Geometry";
import { State } from "../../../../Models/State";

const VIEW_RADIUS = 4;

export function init(scene: BattlegroundScene, state: State) {
  listeners([
    [
      events.BATTLEGROUND_STARTED, () => {
        refreshFogOfWar(scene, state);
      }
    ],
    [
      // TODO: replace with "squads finished moving"
      events.BATTLEGROUND_TICK,
      () => {
        refreshFogOfWar(scene, state);
      },
    ],
  ]);
}

// takes around 0.2~3 ms to run in a 64x64 board and can be optimized
// it is actually slower to use a for loop instead of forEach (takes 0.9ms)
function refreshFogOfWar(scene: BattlegroundScene, state: State) {

  const { fow } = scene;
  if (!fow) throw new Error("fow is null");

  // tried to use fow.culledTiles, but the tiles
  // are not set back to hidden
  fow.forEachTile((tile) => {
    tile.tint = 0x000000;
    tile.alpha = 0.6;
  });

  state.gameData.squads
    .filter((s) => s.force === FORCE_ID_PLAYER)
    .filter((s) => s.status !== UNIT_STATUS.DESTROYED)
    .forEach((s) => showRadius(s.position, fow));

  //player-controlled cities
  state.gameData.cities
    .filter((c) => c.force === FORCE_ID_PLAYER)
    .forEach((c) => showRadius(c.boardPosition, fow));

  state.gameData.squads
    .filter((s) => s.force === FORCE_ID_CPU)
    .filter((s) => s.status !== UNIT_STATUS.DESTROYED)
    .forEach((enemy) => {
      const chara = scene.getChara(enemy.id);

      // hide if under fog of war
      const tile = fow.getTileAt(enemy.position.x, enemy.position.y);
      if (!tile) throw new Error("tile is null");

      const visible = tile.alpha === 0;

      chara.group?.setVisible(visible);
    });
}

function showRadius({ x, y }: Vec2, fow: Phaser.Tilemaps.TilemapLayer) {
  for (let i = -VIEW_RADIUS; i <= VIEW_RADIUS; i++) {
    for (let j = -VIEW_RADIUS; j <= VIEW_RADIUS; j++) {
      //manhattan distance
      const dist = Math.abs(i) + Math.abs(j);

      if (dist > VIEW_RADIUS) continue;

      const tile = fow.getTileAt(i + x, j + y);
      if (!tile) continue;
      tile.alpha = 0;
    }
  }
}
