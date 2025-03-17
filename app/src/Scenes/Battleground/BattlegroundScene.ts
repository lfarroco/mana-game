import Phaser from "phaser";
import { preload } from "./preload";
import { makeUnit, Unit } from "../../Models/Unit";
import processTick from "./ProcessTick";
import { eqVec2, vec2, Vec2 } from "../../Models/Geometry";
import { Chara, CharaSystem_init, createChara } from "../../Systems/Chara/Chara";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getUnit, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import { unitDestroyed } from "./Events/UNIT_DESTROYED";
import * as AISystem from "../../Systems/AI/AI";
import * as HPBarSystem from "../../Systems/Chara/HPBar";

import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { Force, FORCE_ID_PLAYER } from "../../Models/Force";
import * as StoreSystem from "./Store";
import { delay, tween } from "../../Utils/animation";
import { defaultTextConfig, HALF_TILE_HEIGHT, HALF_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "./constants";
import { waves } from "./enemyWaves";
import { vignette } from "./Animations/vignette";
import { summonEffect } from "../../Effects/summonEffect";

export class BattlegroundScene extends Phaser.Scene {

  charas: Chara[] = [];
  isPaused = false;
  grid: (0 | 1)[][] = []
  state: State;
  dropZone: Phaser.GameObjects.Zone | null = null;
  ui: Phaser.GameObjects.Container | null = null;
  dropZoneDisplay: Phaser.GameObjects.Graphics | null = null;
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

    listeners([
      [signals.BATTLEGROUND_TICK, () => {
        processTick(this);
      }],
      [signals.UNIT_CREATED, (unitId: string) => {
        const unit = getUnit(this.state)(unitId);

        this.renderUnit(unit)

      }],
      [signals.UNIT_SELECTED, () => {
        const pop = this.sound.add('ui/button_click')
        pop.play()
      }],
      [signals.WAVE_START, async () => {

        this.hideDropZone();
        this.hideUI();
        tween({
          targets: [this.tileGrid],
          alpha: 0,
          duration: 500 / this.speed,
          ease: 'Power2',
        })

        this.state.gameData.units = this.state.gameData.units.map(u => {
          u.initialPosition = vec2(u.position.x, u.position.y)
          return u;
        })

        await delay(this, 200 / this.speed);

        emit(signals.BATTLEGROUND_TICK)

      }],
      [signals.WAVE_FINISHED, async () => {
        // clear the scene
        // and reposition the units

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

        tween({
          targets: [this.tileGrid],
          alpha: 1,
          duration: 500 / this.speed,
          ease: 'Power2',
          delay: 500,
        });

        this.displayDropZone();

        this.updateUI();

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
        this.updateUI();

      }],

    ]);

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

    const bg = this.add.image(0, 0, 'bg').setDisplaySize(SCREEN_WIDTH, SCREEN_HEIGHT)
      .setPosition(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);

    this.bgImage = bg;

    const tiles = this.add.grid(
      0, 0,
      SCREEN_WIDTH, SCREEN_HEIGHT,
      TILE_WIDTH, TILE_HEIGHT,
      0x000000, 0.3, 0x00FF00, 0.5,
    ).setOrigin(0);
    tiles.setInteractive();

    this.tileGrid = tiles;
    // create outline over tile being hovered
    const hoverOutline = this.add.graphics();
    // orange
    const color = 0xffa500;
    hoverOutline.lineStyle(2, color, 4);
    hoverOutline.strokeRect(0, 0, TILE_WIDTH, TILE_WIDTH);
    hoverOutline.visible = false;

    // have outline follow cursor
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const tile = this.getTileAt(
        vec2(pointer.worldX, pointer.worldY)
      );

      if (tile) {
        hoverOutline.x = tile.x * TILE_WIDTH;
        hoverOutline.y = tile.y * TILE_HEIGHT;
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

    this.createDropZone();

    ControlsSystem.init(this);

    //@ts-ignore
    window.scene = this;

    //this.cameras.main.setZoom(1.5)
    emit(signals.BATTLEGROUND_STARTED);

    this.updateUI();

    this.createWave();


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

    [
      "Gold: " + force.gold,
      "HP: " + force.hp,
      "Wave: " + this.state.gameData.wave,
    ].forEach((text, i) => {
      const uiText = this.add.text(10 + 200 * i, 10, text, defaultTextConfig);
      this.ui?.add(uiText);
    });

    const sidebarWidth = 350;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(
      (this.cameras.main.width - sidebarWidth)
      , 0, sidebarWidth, this.cameras.main.height);

    this.ui?.add(bg);

    StoreSystem.updateStore(this);

    const btn = this.btn(
      "Start Battle",
      SCREEN_WIDTH - 180, SCREEN_HEIGHT - 60,
      () => {
        emit(signals.WAVE_START, this.state.gameData.tick);
      });

    this.ui.add(btn);

  }

  getChara = (id: string) => {
    const chara = this.charas.find((chara) => chara.id === id);
    if (!chara) throw new Error(this.errors.charaNotFound(id));
    return chara;
  };

  getTileAt = (vec: Vec2) => {
    const tile = vec2(
      Math.floor(vec.x / TILE_WIDTH),
      Math.floor(vec.y / TILE_HEIGHT)
    );
    return tile;
  };


  private btn(
    text: string,
    x: number,
    y: number,
    callback: () => void) {
    const btnBg = this.add.image(
      x, y,
      'ui/button'
    ).setOrigin(0.5)
      .setDisplaySize(350, 100);
    const startBattleBtn = this.add.text(
      x, y,
      text,
      {
        ...defaultTextConfig,
        color: '#000000',
        stroke: 'none',
        strokeThickness: 0,
      }).setOrigin(0.5);

    btnBg.setInteractive();

    btnBg.on("pointerup", callback);
    btnBg.on("pointerdown", () => {
      startBattleBtn.setShadow(0, 0, "#000000", 0, true, true);
    });
    btnBg.on("pointerover", () => {
      startBattleBtn.setColor('#ffffff');
      startBattleBtn.setShadow(2, 2, "#000000", 2, true, true);
    });
    btnBg.on("pointerout", () => {
      startBattleBtn.setColor('#000000');
      startBattleBtn.setShadow(0, 0, "#000000", 0, true, true);
    });

    const container = this.add.container(0, 0);
    container.add([btnBg, startBattleBtn]);
    return container;
  }

  async renderUnit(unit: Unit) {

    const vec = vec2(
      unit.position.x * TILE_WIDTH + HALF_TILE_WIDTH,
      unit.position.y * TILE_HEIGHT + HALF_TILE_HEIGHT,
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

  createDropZone() {
    const x = TILE_WIDTH * 6;
    const y = TILE_WIDTH * 1;
    const w = TILE_WIDTH * 4;
    const h = TILE_WIDTH * 5;
    const zone = this.add.zone(x, y, w, h);
    zone.setOrigin(0);

    zone.setName("board");

    zone.setRectangleDropZone(w, h);

    if (!zone.input) throw new Error("dropZone.input is null");

    //this.dropZone.input.dropZone = true;

    this.dropZoneDisplay = this.add.graphics();
    this.dropZoneDisplay.lineStyle(2, 0xffff00);
    this.dropZoneDisplay.strokeRect(
      x, y,
      w, h
    );

    this.dropZone = zone;

    this.updateUI();

  }

  displayDropZone() {

    this.tweens.add({
      targets: this.dropZoneDisplay,
      alpha: 1,
      duration: 500 / this.speed,
    });

  }

  hideDropZone() {

    this.tweens.add({
      targets: this.dropZoneDisplay,
      alpha: 0,
      duration: 500 / this.speed,
    });

  }

  displayError(err: string) {

    this.playFx('ui/error');

    const text = this.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100, err, defaultTextConfig);

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


