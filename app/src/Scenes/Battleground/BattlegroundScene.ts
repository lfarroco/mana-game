import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";

class BattlegroundScene extends Phaser.Scene {
  constructor() {
    super("BattlegroundScene");
  }

  preload = preload;
  create = () => {
    createMap(this);
  }
  update = update;
}
function update() { }

export default BattlegroundScene;

