import Phaser from "phaser";
import { BattlegroundScene } from "../../BattlegroundScene";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../../../Models/Force";
import { listeners, signals } from "../../../../Models/Signals";
import { Vec2 } from "../../../../Models/Geometry";
import { State } from "../../../../Models/State";

const VIEW_RADIUS = 4;

// TODO: create events for when a unit moves in or out the fow

export function init(scene: BattlegroundScene, state: State) {

  listeners([
    [signals.BATTLEGROUND_STARTED, () => {

      const { fow } = scene;
      if (!fow) throw new Error("fow is null");
      refreshFogOfWar(scene, fow, state);
    }],
    [signals.BATTLEGROUND_TICK, () => {

      const { fow } = scene;
      if (!fow) throw new Error("fow is null");
      refreshFogOfWar(scene, fow, state);
    }],
    [signals.MOVE_UNIT_INTO_CELL_FINISH, (unitId: string, position: Vec2) => {

      const isUnderFog = scene.fow!.getTileAt(position.x, position.y).alpha === 0;

      const chara = scene.getChara(unitId);
      chara.container.setVisible(isUnderFog);

    }]
  ]);
}

// takes around 0.2~3 ms to run in a 64x64 board and can be optimized
// it is actually slower to use a for loop instead of forEach (takes 0.9ms)
function refreshFogOfWar(
  scene: BattlegroundScene,
  fow: Phaser.Tilemaps.TilemapLayer,
  state: State,
) {

  // tried to use fow.culledTiles, but the tiles
  // are not set back to hidden
  fow.forEachTile((tile) => {
    tile.tint = 0x000000;
    tile.alpha = 0.6;
  });

  state.gameData.units
    .filter((s) => s.force === FORCE_ID_PLAYER)
    .forEach((s) => showRadius(s.position, fow));

  //player-controlled cities
  state.gameData.cities
    .filter((c) => c.force === FORCE_ID_PLAYER)
    .forEach((c) => showRadius(c.boardPosition, fow));

  state.gameData.units
    .filter((s) => s.force === FORCE_ID_CPU)
    .forEach((enemy) => {
      const chara = scene.getChara(enemy.id);

      // hide if under fog of war
      const tile = fow.getTileAt(enemy.position.x, enemy.position.y);
      if (!tile) throw new Error(scene.errors.noTileAt(enemy.position));

      const visible = tile.alpha === 0;

      chara.container.setVisible(visible);
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
