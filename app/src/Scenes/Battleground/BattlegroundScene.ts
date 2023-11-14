import Phaser from "phaser";
import { isUndefined } from "util";
import { Unit } from "../../Models/Unit";

class BattlegroundScene extends Phaser.Scene {
  constructor() {
    super("BattlegroundScene");
  }

  preload = preload;
  create = create;
  update = update;
}

function preload(this: Phaser.Scene) {
  ["castle", "cave", "fort", "town"].forEach(city => {
    this.load.image(city, `assets/cities/${city}.png`);
    this.load.image(`${city}_map`, `assets/cities/${city}_map.png`);

  });
  this.load.image("tilesets/pipoya", "assets/tilesets/pipoya.png");
  this.load.tilemapTiledJSON("maps/map1", "assets/maps/map1/mapdata.json");

  //@ts-ignore
  this.load.spineBinary("spine-data", "assets/spine/_base/skeleton.skel");
  //@ts-ignore
  this.load.spineAtlas("spine-atlas", "assets/spine/_base/skeleton.atlas");
}

function create(this: Phaser.Scene) {
  const map = this.make.tilemap({ key: "maps/map1" });

  const tiles = map.addTilesetImage("tilesets/pipoya", "tilesets/pipoya");


  if (!tiles) {
    console.error("tiles is null");
    return;
  }

  map.createLayer(0, tiles);
  map.createLayer(1, tiles);
  map.createLayer(2, tiles);

  console.log(map.objects);
  map.objects.forEach((objectLayer) => {
    if (objectLayer.name === "cities") {
      objectLayer.objects.forEach((obj) => {
        if (obj.x === undefined || obj.y === undefined) {
          console.error("obj.x or obj.y is undefined");
          return;
        }
        const cityType: string = obj.properties.find((prop: { name: string }) => prop.name === "type")?.value;

        if (cityType) {

          this.add.image(obj.x, obj.y, `${cityType}_map`).setName(obj.name);
        } else {
          console.error("cityType is undefined");
        }
      });
    } else if (objectLayer.name === "enemies") {
      objectLayer.objects.forEach((obj) => {
        if (obj.x === undefined || obj.y === undefined) {
          console.error("obj.x or obj.y is undefined");
          return;
        }
        chara(obj.x, obj.y, this);
      });

    }
  });


}

function chara(x: number, y: number, scene: Phaser.Scene) {
  //@ts-ignore
  const spineboy = scene.add.spine(x, y, "spine-data", "spine-atlas");
  spineboy.scale = 0.1;
  spineboy.skeleton.setSkinByName("archer");
  spineboy.animationState.setAnimation(0, "map-idle", true);
}

function update() { }

export default BattlegroundScene;

