import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { makeUnit, Unit } from "../../Models/Unit";
import processTick from "./ProcessTick";
import { eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { Chara, CharaSystem_init, createChara } from "../../Systems/Chara/Chara";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getUnit, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import { unitDestroyed } from "./Events/UNIT_DESTROYED";
import * as FogOfWarSystem from "./Systems/FogOfWar/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as AISystem from "../../Systems/AI/AI";
import * as HPBarSystem from "../../Systems/Chara/HPBar";
import * as HightlightCellsSystem from "./Map/highlightCells";

import { createFowLayer } from "./Systems/FogOfWar/createFowLayer";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { Force, FORCE_ID_PLAYER } from "../../Models/Force";
import * as StoreSystem from "./Store";
import { delay, tween } from "../../Utils/animation";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";
import { waves } from "./enemyWaves";
import { vignette } from "./Animations/vignette";
import { summonEffect } from "../../Effects/summonEffect";
import { GlowingOrb } from "../../Effects/GlowingOrb";

export class BattlegroundScene extends Phaser.Scene {

  graphics: Phaser.GameObjects.Graphics | null = null;
  charas: Chara[] = [];
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  isPaused = false;
  tilemap: Phaser.Tilemaps.Tilemap | null = null;
  fow: Phaser.Tilemaps.TilemapLayer | null = null;
  grid: (0 | 1)[][] = []
  state: State;
  dropZone: Phaser.GameObjects.Zone | null = null;
  ui: Phaser.GameObjects.Container | null = null;
  dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
  playerForce: Force;

  cleanup() {
    this.charas.forEach(chara => {
      chara.container.destroy(true)
    })
    this.charas = []
    this.layers?.background.destroy()
    this.layers?.obstacles.destroy()
    this.layers?.features.destroy()
    this.layers = null
    this.tilemap?.destroy()
    this.tilemap = null
    this.graphics?.destroy();
    this.isPaused = false;
    this.time.removeAllEvents();
    this.fow?.destroy()
    this.fow = null
    this.grid = []
  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;
    this.playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

    listeners([
      [signals.BATTLEGROUND_TICK, () => {
        processTick(this);
      }],
      [signals.UNIT_CREATED, (unitId: string) => {
        const unit = this.getSquad(unitId)

        this.renderUnit(unit)

      }],
      [signals.UNIT_SELECTED, () => {
        const pop = this.sound.add('ui/button_click')
        pop.play()
      }],
      [signals.WAVE_START, async () => {

        this.hideDropZone();
        this.hideUI();

        this.state.gameData.units = this.state.gameData.units.map(u => {
          u.initialPosition = vec2(u.position.x, u.position.y)
          return u;
        })

        await delay(this, 200 / this.state.options.speed);

        emit(signals.BATTLEGROUND_TICK)

      }],
      [signals.WAVE_FINISHED, async () => {
        // clear the scene
        // and reposition the units


        this.displayDropZone();

        this.updateUI();

        this.charas.forEach(chara => chara.container.destroy())
        this.state.gameData.units = this.state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER);
        this.charas = []
        this.state.gameData.units = this.state.gameData.units.map(u => {
          return makeUnit(
            u.id,
            u.force,
            u.job,
            u.initialPosition
          )
        });
        this.state.gameData.tick = 0;
        this.state.gameData.units.forEach(u =>
          this.renderUnit(u)
        );

        this.state.gameData.wave++;

        const isGameOver = this.state.gameData.wave > Object.keys(waves).length;

        if (isGameOver) {
          await vignette(this, "Victory! Thanks for Playing!");

          this.charas.forEach(chara => chara.container.destroy())
          this.charas = []
          this.state.gameData.units = []
          this.state.gameData.wave = 1;


        }

        this.createWave();
        this.renderStore();

      }],

    ]);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    unitDestroyed(this, state);
    AISystem.init(state);
    if (state.options.fogOfWarEnabled)
      FogOfWarSystem.init(this, state);
    CursorSystem.init(state, this);
    HPBarSystem.init(state, this);
    BattlegroundAudioSystem_init(state, this);
    HightlightCellsSystem.init(this);
    CharaSystem_init(this);
    StoreSystem.init(this);

    //@ts-ignore
    window.bg = this;

  }

  hideUI() {
    this.ui?.destroy(false);
  }

  preload = preload;
  create = async (state: State) => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    this.sound.setVolume(0.05)

    console.log("BattlegroundScene create");
    const { map, layers } = createMap(this);

    this.layers = layers;
    this.tilemap = map;

    makeMapInteractive(this, map, layers.background);

    if (state.options.fogOfWarEnabled)
      this.fow = createFowLayer(this)

    this.grid = layers.obstacles.layer.data.map((row) =>
      row.map((tile) => (tile.index === -1 ? 0 : 1))
    );

    this.createDropZone();

    ControlsSystem.init(this);

    //@ts-ignore
    window.scene = this;

    //this.cameras.main.setZoom(1.5)
    emit(signals.BATTLEGROUND_STARTED);

    this.updateUI();

    this.createWave();

    this.renderStore();

  };

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

  updateUI() {

    this.ui?.destroy(true);

    const force = this.playerForce

    this.ui = this.add.container(0, 0);

    const gold = this.add.text(
      SCREEN_WIDTH - 200, 250, "Gold: " + force.gold, {
      fontSize: "24px",
      color: "white"
    });

    this.ui.add(gold);

    const startBattleBtn = this.add.text(SCREEN_WIDTH - 200, SCREEN_HEIGHT - 200, "Start Battle", {
      fontSize: "24px",
      color: "white"
    });

    startBattleBtn.setInteractive();

    startBattleBtn.on("pointerdown", () => {
      emit(signals.WAVE_START, this.state.gameData.tick);
    });

    this.ui.add(startBattleBtn);

    const playerHP = this.add.text(SCREEN_WIDTH - 200, 350, "HP: " + force.hp, {
      fontSize: "24px",
      color: "white"
    });

    this.ui.add(playerHP);

    const wave = this.add.text(SCREEN_WIDTH - 200, 400, "Wave: " + this.state.gameData.wave, {
      fontSize: "24px",
      color: "white"
    });

    this.ui.add(wave);

  }

  renderStore() {
    StoreSystem.updateStore(this);
  }

  getChara = (id: string) => {
    const chara = this.charas.find((chara) => chara.id === id);
    if (!chara) throw new Error(this.errors.charaNotFound(id));
    return chara;
  };

  getSquad = (id: string) => {
    return getUnit(getState())(id)
  };

  getTileAt = (vec: Vec2) => {
    const tile = this.layers?.background.getTileAt(vec.x, vec.y, true);
    if (!tile) {
      throw new Error(this.errors.noTileAt(vec));
    }
    return tile;
  };
  getTileAtWorldXY = (vec: Vec2) => {
    const tile = this.layers?.background.getTileAtWorldXY(vec.x, vec.y);
    if (!tile) throw new Error(this.errors.noTileAt(vec));
    return tile;
  };
  isTileVisible = (vec: Vec2) => {
    const { fow } = this;

    if (!fow) throw new Error("fow is null");

    const tile = fow.getTileAt(vec.x, vec.y);

    return tile.alpha === 0;
  }

  async renderUnit(unit: Unit) {


    const vec = vec2(unit.position.x * 64 + 32,
      unit.position.y * 64 + 32)

    summonEffect(this, vec);

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

  createDropZone() {
    const x = 64 * 8;
    const y = 64 * 8;
    const w = 64 * 10;
    const h = 64 * 4;
    const zone = this.add.zone(x, y, w, h)

    zone.setName("board");

    zone.setRectangleDropZone(w, h);

    if (!zone.input) throw new Error("dropZone.input is null");

    //this.dropZone.input.dropZone = true;

    this.dropZoneDisplay = this.add.graphics();
    this.dropZoneDisplay.lineStyle(2, 0xffff00);
    this.dropZoneDisplay.strokeRect(
      x - w / 2, y - h / 2,
      w, h
    );

    this.dropZone = zone;

    this.updateUI();

  }

  displayDropZone() {

    this.dropZoneDisplay?.setVisible(true);

  }

  hideDropZone() {

    this.dropZoneDisplay?.setVisible(false);

  }

  displayError(err: string) {

    this.playFx('ui/error');

    const text = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100, err, {
      fontSize: "48px",
      color: "#fff",
      align: "center",
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: "#000",
        blur: 2,
        stroke: true,
        fill: true
      }
    });

    text.setOrigin(0.5)
    this.tweens.add({
      targets: text,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 200,
      yoyo: true,
      repeat: 0,
      onComplete: async () => {
        await delay(this, 1000);
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            text.destroy();
          }
        })
      }
    })

  }

}

export default BattlegroundScene;


