import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { makeUnit, Unit } from "../../Models/Unit";
import processTick from "./ProcessTick";
import { asVec2, eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { Chara, CharaSystem_init, createChara } from "../../Systems/Chara/Chara";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getUnit, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import { unitDestroyed } from "./Events/UNIT_DESTROYED";
import * as FogOfWarSystem from "./Systems/FogOfWar/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as AISystem from "../../Systems/AI/AI";
import { EmoteSystem_init } from "../../Systems/Chara/Emote";
import * as HPBarSystem from "../../Systems/Chara/HPBar";
import * as EntitySelection from "../../Systems/EntitySelection/EntitySelection";
import * as HightlightCellsSystem from "./Map/highlightCells";

import { createFowLayer } from "./Systems/FogOfWar/createFowLayer";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { clearCellHighlights } from "./Map/highlightCells";
import { AuraPipeline } from "../../Shaders/aura";
import { jobs } from "../../Models/Job";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { updateBench } from "./Bench";
import { updateStore } from "./Store";
import { delay } from "../../Utils/animation";

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
  store: Unit[] = [];
  bench: Unit[] = [];
  storeContainer: Phaser.GameObjects.Container | null = null;
  benchContainer: Phaser.GameObjects.Container | null = null;
  unitPool: Unit[] = [];
  dropZone: Phaser.GameObjects.Graphics | null = null;

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
    this.bench = [];
  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;

    listeners([
      [signals.BATTLEGROUND_TICK, () => {
        processTick(this);
        this.benchContainer?.destroy();
        this.storeContainer?.destroy();
      }],
      [signals.UNIT_CREATED, (unitId: string) => {
        const unit = this.getSquad(unitId)

        this.renderUnit(unit)

      }],
      [signals.UNIT_SELECTED, () => {
        const pop = this.sound.add('ui/button_click')
        pop.play()
      }],
      [signals.BATTLE_START, async () => {

        this.hideDropZone();

        const enemies = [
          makeUnit(Math.random().toString(), FORCE_ID_CPU, "orc", vec2(1, 1)),
          makeUnit(Math.random().toString(), FORCE_ID_CPU, "orc", vec2(2, 1)),
        ]

        this.state.gameData.units = this.state.gameData.units.concat(enemies)

        this.state.gameData.units = this.state.gameData.units.map(u => {
          return { ...u, initialPosition: vec2(u.position.x, u.position.y) }
        })

        enemies.forEach((unit) => this.renderUnit(unit))

        await delay(this, 200)

        emit(signals.BATTLEGROUND_TICK)

      }],
      [signals.COMBAT_FINISHED, () => {
        // clear the scene
        // and reposition the units

        this.displayDropZone();

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
        this.renderStore();
        this.renderBench();
      }]
    ]);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    unitDestroyed(this, state);
    AISystem.init(state);
    EmoteSystem_init(state, this);
    EntitySelection.init(state);
    if (state.options.fogOfWarEnabled)
      FogOfWarSystem.init(this, state);
    CursorSystem.init(state, this);
    HPBarSystem.init(state, this);
    BattlegroundAudioSystem_init(state, this);
    HightlightCellsSystem.init(this);
    CharaSystem_init(this);

    //@ts-ignore
    window.bg = this;

  }

  preload = preload;
  create = (state: State) => {
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

    this.unitPool = new Array(30).fill(null).map(() => {
      return makeUnit(
        Math.random().toString(),
        FORCE_ID_PLAYER,
        jobs[Math.floor(Math.random() * jobs.length)].id,
        asVec2({ x: 0, y: 0 })
      );
    });

    this.populateStore();

    this.renderStore();

    this.renderBench();

  };

  populateStore() {
    // place units from the store back into the pool
    this.unitPool = this.unitPool.concat(this.store);

    this.store = [];

    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * this.unitPool.length);
      const unit = this.unitPool.splice(randomIndex, 1)[0];

      this.store.push(unit);
    }
  }
  renderStore() {
    updateStore(this);
  }

  renderBench() {

    updateBench(this);

  }


  createShader = (chara: Chara) => {
    const shader = this.add.image(0, 0, "");

    shader.setDisplaySize(200, 200);
    shader.setOrigin(0.5, 0.5);

    const auraPipeline = (this.renderer as Phaser.Renderer.WebGL.WebGLRenderer)
      .pipelines.add('auraPipeline', new AuraPipeline(this.game)) as AuraPipeline
    shader.setPipeline('auraPipeline');
    this.children.moveBelow(shader, chara.sprite)

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const camera = this.cameras.main;
        shader.x = chara.container.x;
        shader.y = chara.container.y;

        // feature created with this conversation
        // https://chatgpt.com/share/67959591-f0f8-8004-83e8-3e1e55d1965b

        const cx = camera.worldView.x + camera.centerX / camera.zoom;
        const cy = camera.worldView.y + camera.centerY / camera.zoom;

        const dx = (cx - shader.x);
        const dy = (cy - shader.y);

        // get the distance from the center of the camera to the center of the sprite
        auraPipeline.setCenter(
          (camera.centerX - dx * camera.zoom),
          // screen space has y inverted
          (camera.centerY + dy * camera.zoom)
        );

        auraPipeline.updateTime(this.time.now / 100);
        auraPipeline.setResolution(64 * camera.zoom, 120 * camera.zoom);

      }
    });

    return auraPipeline

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

  createMapSquads() {
    getState().gameData.units
      .forEach((unit) => this.renderUnit(unit));
  }

  renderUnit(unit: Unit) {
    const chara = createChara(
      this,
      unit,
    )

    this.charas.push(chara)

    emit(signals.CHARA_CREATED, unit.id)

  }

  pauseGame = () => {
    this.isPaused = true;
  };
  resumeGame = () => {
    this.isPaused = false;
  };
  moveUnitsTo = (unitIds: string[], { x, y }: Vec2) => {
    const units = getState().gameData.units.filter((u) => unitIds.includes(u.id));

    clearCellHighlights(this);

    units.forEach(async (unit) => {
      emit(signals.DISPLAY_EMOTE, unit.id, "moving-emote");
    });
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
    this.dropZone = this.add.graphics();
    this.dropZone.fillStyle(0x00ff00, 0.2);
    this.dropZone.fillRect(64, 64 * 6, 64 * 10, 64 * 4);
    this.dropZone.setInteractive(
      new Phaser.Geom.Rectangle(100, 400, 500, 200),
      Phaser.Geom.Rectangle.Contains
    );
    this.dropZone.setName("board");

    if (this.dropZone.input)
      this.dropZone.input.dropZone = true;

  }

  displayDropZone() {

    this.dropZone?.setVisible(true);

  }

  hideDropZone() {

    this.dropZone?.setVisible(false);

  }

}

export default BattlegroundScene;


