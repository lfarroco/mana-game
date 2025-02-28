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
import { EmoteSystem_init } from "../../Systems/Chara/Emote";
import * as HPBarSystem from "../../Systems/Chara/HPBar";
import * as HightlightCellsSystem from "./Map/highlightCells";

import { createFowLayer } from "./Systems/FogOfWar/createFowLayer";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { clearCellHighlights } from "./Map/highlightCells";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import * as StoreSystem from "./Store";
import { delay } from "../../Utils/animation";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "./constants";

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
  maxUnitsDisplay: Phaser.GameObjects.Text | null = null;
  ui: Phaser.GameObjects.Container | null = null;

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
      [signals.BATTLE_START, async () => {

        this.hideDropZone();
        this.hideUI();

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

        this.showUI();

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
      }]

    ]);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    unitDestroyed(this, state);
    AISystem.init(state);
    EmoteSystem_init(state, this);
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

  showUI() {
    this.ui?.setVisible(true);
  }

  hideUI() {
    this.ui?.setVisible(false);
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

    this.populateStore();

    // todo: check if necessary
    this.renderStore();


    this.updateUI()
  };

  updateUI() {

    const force = this.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

    this.ui = this.add.container(0, 0);

    const startBattleBtn = this.add.text(SCREEN_WIDTH - 200, SCREEN_HEIGHT - 200, "Start Battle", {
      fontSize: "24px",
      color: "white"
    });

    startBattleBtn.setInteractive();

    startBattleBtn.on("pointerdown", () => {
      emit(signals.BATTLE_START, this.state.gameData.tick);
    });

    this.ui.add(startBattleBtn);

    const playerHP = this.add.text(SCREEN_WIDTH - 200, 150, "HP: " + force.hp, {
      fontSize: "24px",
      color: "white"
    });

    this.ui.add(playerHP);


  }

  populateStore() {

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
    const zone = this.add.zone(64 * 6, 64 * 6, 64 * 10, 64 * 4)

    zone.setName("board");

    zone.setRectangleDropZone(64 * 10, 64 * 4);

    if (!zone.input) throw new Error("dropZone.input is null");

    //this.dropZone.input.dropZone = true;

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffff00);
    graphics.strokeRect(
      zone.x - zone.input.hitArea.width / 2,
      zone.y - zone.input.hitArea.height / 2, zone.input.hitArea.width, zone.input.hitArea.height);

    this.dropZone = zone;

    this.updateMaxUnitsDisplay();


  }

  updateMaxUnitsDisplay() {


    const force = this.state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;
    this.maxUnitsDisplay?.destroy();
    this.maxUnitsDisplay = this.add.text(
      SCREEN_WIDTH - 200, SCREEN_HEIGHT - 100,
      this.state.gameData.units.filter(u => u.force === FORCE_ID_PLAYER).length + "/" + force.maxUnits
      , {
        fontSize: "48px",
        color: "white"
      });

  }

  displayDropZone() {

    this.dropZone?.setVisible(true);

  }

  hideDropZone() {

    this.dropZone?.setVisible(false);
    this.maxUnitsDisplay?.destroy();

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


