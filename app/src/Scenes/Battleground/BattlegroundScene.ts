import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { BGState, initialState } from "./BGState";
import { importMapObjects } from "./importMapObjects";

class BattlegroundScene extends Phaser.Scene {
  state: BGState;
  constructor() {
    super("BattlegroundScene");
    this.state = initialState

    //@ts-ignore
    window.state = this.state
  }

  preload = preload;
  create = () => {
    const map = createMap(this);

    importMapObjects(this.state, map);
  }
  update = update;

}
function update() { }

export default BattlegroundScene;

