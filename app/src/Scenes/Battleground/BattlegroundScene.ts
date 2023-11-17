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
    const { map, layers } = createMap(this);

    importMapObjects(this.state, map);

    makeMapInteractive(this, map, layers.background)

    const entities = createMapEntities(this, map)

    layers.obstacles.setCollisionBetween(0, 1000);
    this.physics.add.collider(entities, layers.obstacles);

  }
  update = update;

}
function update() { }

export default BattlegroundScene;

