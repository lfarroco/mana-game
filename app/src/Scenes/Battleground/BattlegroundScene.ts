import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { BGState, initialState } from "./BGState";
import { importMapObjects } from "./importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { createMapEntities } from "./Map/createMapEntities";

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
    const { map, layer } = createMap(this);

    importMapObjects(this.state, map);

    makeMapInteractive(this, map, layer)

    createMapEntities(this, map)
  }
  update = update;

}
function update() { }

export default BattlegroundScene;

