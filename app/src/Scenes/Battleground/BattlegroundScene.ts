import Phaser from "phaser";
import { preload } from "./preload";
import { Unit } from "../../Models/Unit";
import { eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { Chara, CharaSystem_init, createChara } from "../../Systems/Chara/Chara";
import { emit, signals } from "../../Models/Signals";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import { unitDestroyed } from "./Events/UNIT_DESTROYED";
import * as AISystem from "../../Systems/AI/AI";
import * as HPBarSystem from "../../Systems/Chara/HPBar";

import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { Force, FORCE_ID_PLAYER } from "../../Models/Force";
import * as StoreSystem from "./Store";
import { tween } from "../../Utils/animation";
import * as constants from "./constants";
import { waves } from "./enemyWaves";
import { summonEffect } from "../../Effects/summonEffect";
import * as InterruptSystem from "./Systems/Interrupt";
import { setupEventListeners } from "./EventHandlers";
import * as UIManager from "./Systems/UIManager";

export class BattlegroundScene extends Phaser.Scene {

  charas: Chara[] = [];
  isPaused = false;
  grid: (0 | 1)[][] = []
  state: State;
  playerForce: Force;
  speed: number;
  tileGrid!: Phaser.GameObjects.Grid;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;

  cleanup() {
    this.charas.forEach(chara => {
      chara.container.destroy(true)
    })
    this.charas = []
    this.isPaused = false;
    this.time.removeAllEvents();
    this.grid = []
  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;
    this.speed = state.options.speed;
    this.playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

    setupEventListeners(this);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    unitDestroyed(this, state);
    AISystem.init(state);
    HPBarSystem.init(state, this);
    BattlegroundAudioSystem_init(state, this);
    CharaSystem_init(this);
    StoreSystem.init(this);
    InterruptSystem.init(this);

    UIManager.init(this);

    //@ts-ignore
    window.bg = this;

  }

  preload = preload;
  create = async (state: State) => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    this.sound.setVolume(0.05)

    console.log("BattlegroundScene create");

    const bg = this.add.image(0, 0, 'bg').setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
      .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

    this.bgImage = bg;

    const tiles = this.add.grid(
      0, 0,
      constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT,
      constants.TILE_WIDTH, constants.TILE_HEIGHT,
      0x000000, 0, 0x00FF00, 0.5,
    ).setOrigin(0);
    tiles.setInteractive();

    this.tileGrid = tiles;
    // create outline over tile being hovered
    const hoverOutline = this.add.graphics();
    // orange
    const color = 0xffa500;
    hoverOutline.lineStyle(2, color, 4);
    hoverOutline.strokeRect(0, 0, constants.TILE_WIDTH, constants.TILE_WIDTH);
    hoverOutline.visible = false;

    // have outline follow cursor
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const tile = this.getTileAt(
        vec2(pointer.worldX, pointer.worldY)
      );

      if (tile) {
        hoverOutline.x = tile.x * constants.TILE_WIDTH;
        hoverOutline.y = tile.y * constants.TILE_HEIGHT;
        hoverOutline.visible = true;
      } else {
        hoverOutline.visible = false;
      }
    });

    this.bgContainer = this.add.container(0, 0);
    this.bgContainer.add([bg, tiles, hoverOutline]);


    this.grid = [[]];
    for (let y = 0; y < 32; y++) {
      this.grid[y] = [];
      for (let x = 0; x < 32; x++) {
        this.grid[y][x] = 0;
      }
    }

    ControlsSystem.init(this);

    //@ts-ignore
    window.scene = this;

    //this.cameras.main.setZoom(1.5)
    emit(signals.BATTLEGROUND_STARTED);

    UIManager.createDropZone(this);
    UIManager.updateUI();

    this.createWave();

  };

  // TODO: move to CharaSystem
  createParticle(id: string, status: string) {

    const chara = this.getChara(id);

    const alreadyExists = chara.container.getByName("status-" + status);
    if (alreadyExists) {
      alreadyExists.destroy();
    }

    const particles = this.add.particles(
      0, 0,
      'white-dot',
      {
        speed: 10,
        lifespan: 700,
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: 1,
        frequency: 100,
        emitZone: {
          type: 'edge',
          source: new Phaser.Geom.Circle(0, 0, 20),
          quantity: 10,
          yoyo: false
        }
      }).setName("status-" + status);
    chara.container.add(particles);

  }

  createWave() {
    const enemies = waves[this.state.gameData.wave]

    this.state.gameData.units = this.state.gameData.units.concat(enemies)

    this.state.gameData.units = this.state.gameData.units.map(u => {
      u.initialPosition = vec2(u.position.x, u.position.y)
      return u;
    })

    enemies.forEach((unit) => this.renderUnit(unit))
  }

  getChara = (id: string) => this.charas.find((chara) => chara.id === id)!;

  getTileAt = (vec: Vec2) => {
    const tile = vec2(
      Math.floor(vec.x / constants.TILE_WIDTH),
      Math.floor(vec.y / constants.TILE_HEIGHT)
    );
    return tile;
  };

  async renderUnit(unit: Unit) {

    const vec = vec2(
      unit.position.x * constants.TILE_WIDTH + constants.HALF_TILE_WIDTH,
      unit.position.y * constants.TILE_HEIGHT + constants.HALF_TILE_HEIGHT,
    );

    summonEffect(this, this.speed, vec);

    const chara = createChara(
      this,
      unit,
    )

    chara.container.setAlpha(0);

    this.charas.push(chara)

    emit(signals.CHARA_CREATED, unit.id)

    tween({
      targets: [chara.container],
      alpha: 1,
      duration: 500,
      ease: 'Power2',
    })

  }

  pauseGame = () => {
    this.isPaused = true;
  };
  resumeGame = () => {
    this.isPaused = false;
  };

  errors = {
    noTileAt: ({ x, y }: Vec2) => `no tile at ${x}, ${y}`,
    squadNotFound: (id: string) => `unit ${id} not found`,
    cityNotFound: (id: string) => `city ${id} not found`,
    charaNotFound: (id: string) => `chara ${id} not found`,
    errorCreatingTileset: (tilesetName: string) => `error creating tileset ${tilesetName}`,
    errorCreatingTilemapLayer: (layerName: string) => `error creating tilemap layer ${layerName}`,
  };

  getCharaAt = (vec: Vec2) => {
    const chara = this.charas
      .filter(chara => chara.unit.hp > 0)
      .find((chara) => eqVec2(chara.unit.position, vec));

    return chara
  }

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;