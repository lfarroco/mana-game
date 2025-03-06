import Phaser from "phaser";
import BattlegroundScene from "../BattlegroundScene";
import { vec2 } from "../../../Models/Geometry";
import { onPointerMove } from "./Events/POINTER_MOVE";
import { onPointerDown } from "./Events/POINTER_DOWN";

export function makeMapInteractive(
  scene: BattlegroundScene,
  map: Phaser.Tilemaps.Tilemap,
  bgLayer: Phaser.Tilemaps.TilemapLayer
) {

  console.log("adding map listeners");
  //set camera bounds to the world
  scene.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  bgLayer?.setInteractive({ draggable: true });

  let startScroll = vec2(0, 0);

  onPointerDown(bgLayer, startScroll, scene);

  onPointerMove(bgLayer, startScroll, scene);

}

