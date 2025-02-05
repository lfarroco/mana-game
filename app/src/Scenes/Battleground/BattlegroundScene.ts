import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { importMapObjects } from "./Map/importMapObjects";
import { createCities } from "./Map/createCities";
import { Unit } from "../../Models/Unit";
import processTick from "./ProcessTick";
import { eqVec2, Vec2 } from "../../Models/Geometry";
import { Chara, CharaSystem_init, createChara } from "../../Systems/Chara/Chara";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getUnit, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as StaminaRegen from "../../Systems/HPRegen/HPRegen";
import * as VictorySystem from "../../Systems/Victory/Victory";
import { unitDestroyed } from "./Events/UNIT_DESTROYED";
import { City } from "../../Models/City";
import * as CityCaptureSystem from "./Systems/cityCapture";
import * as FogOfWarSystem from "./Systems/FogOfWar/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as Pathfinding from "./Systems/Pathfinding";
import * as AISystem from "../../Systems/AI/AI";
import { EmoteSystem_init } from "../../Systems/Chara/Emote";
import * as HPBarSystem from "../../Systems/Chara/HPBar";
import * as EntitySelection from "../../Systems/EntitySelection/EntitySelection";
import * as CharaSystem from "../../Systems/Chara/Events";
import * as HightlightCellsSystem from "./Map/highlightCells";

import { TURN_DURATION } from "../../config";
import { createFowLayer } from "./Systems/FogOfWar/createFowLayer";
import { DestinationDisplaySystem_init } from "./Systems/DestinationDisplay";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { clearCellHighlights } from "./Map/highlightCells";
import { FORCE_ID_PLAYER } from "../../Models/Force";
import { AuraPipeline } from "../../Shaders/aura";
import { DestinationGoal_init } from "./Systems/DestinationGoal";

export class BattlegroundScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics | null = null;
  charas: Chara[] = [];
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  isPaused = false;
  isSelectingSquadMove = false;
  isSelectingAttackTarget = false;
  cities: { city: City; sprite: Phaser.GameObjects.Image }[] = []; // TODO: data duplication, this should be just a list of sprites
  tilemap: Phaser.Tilemaps.Tilemap | null = null;
  fow: Phaser.Tilemaps.TilemapLayer | null = null;
  grid: (0 | 1)[][] = []
  state: State;

  // skill state - TODO: move this into the skill system
  selectedSkillId: string | null = null;
  casterId: string | null = null;

  cleanup() {
    this.charas.forEach(chara => {
      chara.container.destroy(true)
    })
    this.charas = []
    this.cities.forEach(city => {
      city.sprite.destroy()
    })
    this.cities = []
    this.layers?.background.destroy()
    this.layers?.obstacles.destroy()
    this.layers?.features.destroy()
    this.layers = null
    this.tilemap?.destroy()
    this.tilemap = null
    this.graphics?.destroy();
    this.isPaused = false;
    this.isSelectingSquadMove = false;
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
      [signals.SELECT_UNIT_MOVE_START, () => {
        this.isSelectingSquadMove = true;
      }],
      [signals.SELECT_UNIT_MOVE_DONE, this.moveUnitsTo],
      [signals.SELECT_UNIT_MOVE_CANCEL, () => {
        this.isSelectingSquadMove = false;
      }],
      [signals.SELECT_SKILL_TARGET_START, (unitId: string, skillId: string) => {
        this.casterId = unitId;
        this.selectedSkillId = skillId;
      }],
      [signals.SELECT_SKILL_TARGET_DONE, (casterId: string, skillId: string, tile: Vec2, targetId: string | null) => {

        this.casterId = null;
        this.selectedSkillId = null;

      }],
      [signals.SELECT_SKILL_TARGET_CANCEL, () => {
        // TOOD: move this into the skill system
        this.selectedSkillId = null;
        this.casterId = null;
      }],
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
      [
        signals.NEXT_IDLE_UNIT, () => {
          const [idle] = this.charas
            .filter(c => c.unit.hp > 0) // TOOD: clean up dead units, or use getter
            .filter(c => c.unit.force === FORCE_ID_PLAYER)
            .filter(c => c.unit.order.type === "none");

          if (!idle) {
            return
          }
          emit(signals.UNIT_SELECTED, idle.id)
          this.cameras.main.pan(
            idle.container.x,
            idle.container.y,
            500 / state.options.speed,
            'Sine.easeInOut',
          );
        }
      ],
      [
        signals.UNIT_ORDER_STOP, (unitId: string) => {
          emit(signals.DISPLAY_EMOTE, unitId, "question-emote");
        }
      ]

    ]);


    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    unitDestroyed(this, state);
    VictorySystem.init(state);
    AISystem.init(state);
    EmoteSystem_init(state, this);
    CityCaptureSystem.init(this);
    Pathfinding.init(this);
    StaminaRegen.init(state);
    EntitySelection.init(state);
    CharaSystem.init(this, state);
    FogOfWarSystem.init(this, state);
    CursorSystem.init(state, this);
    HPBarSystem.init(state, this);
    DestinationDisplaySystem_init(state, this);
    BattlegroundAudioSystem_init(state, this);
    HightlightCellsSystem.init(this);
    DestinationGoal_init(this);
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
    if (state.gameData.units.length > 0) {
      console.log("BattlegroundScene create with gameData: ", state.gameData)
    } else {
      importMapObjects(map);
    }

    this.layers = layers;
    this.tilemap = map;
    this.cities = createCities(this, state.gameData.cities);
    this.createMapSquads();

    makeMapInteractive(this, map, layers.background);


    this.fow = createFowLayer(this)

    this.grid = layers.obstacles.layer.data.map((row) =>
      row.map((tile) => (tile.index === -1 ? 0 : 1))
    );

    ControlsSystem.init(this);

    //@ts-ignore
    window.scene = this;

    this.cameras.main.setZoom(1.5)
    emit(signals.BATTLEGROUND_STARTED);

    const chara = this.charas.filter(c => c.force === FORCE_ID_PLAYER)[0]
    this.cameras.main.pan(
      chara.container.x, chara.container.y,
      500, 'Sine.easeInOut', true);

    //this.createShader(chara)

    this.displayOrderEmotes();

    console.log("BattlegroundScene create done");

  };

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

  displayOrderEmotes() {
    this.charas
      .filter(c => c.unit.force === FORCE_ID_PLAYER)
      .forEach(c => {

        if (c.unit.order.type === "none") {
          emit(signals.DISPLAY_EMOTE, c.unit.id, "question-emote");
        } else if (c.unit.order.type === "move") {
          emit(signals.DISPLAY_EMOTE, c.unit.id, "moving-emote");
        } else if (c.unit.order.type === "skill-on-unit") {
          emit(signals.DISPLAY_EMOTE, c.unit.id, "combat-emote");
        }
      });
  }

  getChara = (id: string) => {
    const chara = this.charas.find((chara) => chara.id === id);
    if (!chara) throw new Error(this.errors.charaNotFound(id));
    return chara;
  };

  getSquad = (id: string) => {
    return getUnit(getState())(id)
  };

  getCity = (id: string) => {
    const city = this.cities.find((city) => city.city.id === id);
    if (!city) throw new Error(this.errors.cityNotFound(id));
    return city;
  }

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

    this.isSelectingSquadMove = false;

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
}

export default BattlegroundScene;
