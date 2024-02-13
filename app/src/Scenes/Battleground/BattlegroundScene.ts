import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { makeSquadInteractive, } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { UNIT_STATUS_KEYS, Unit, } from "../../Models/Unit";
import processTick from "./ProcessTick";
import { Vec2, vec2 } from "../../Models/Geometry";
import { Chara, createChara } from "../../Systems/Chara/Chara";
import { emit, signals, listeners } from "../../Models/Signals";
import { State, getSquad, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as StaminaRegen from "../../Systems/StaminaRegen/StaminaRegen";
import * as VictorySystem from "../../Systems/Victory/Victory";
import { squadDestroyed } from "./Events/SQUAD_DESTROYED";
import { City } from "../../Models/City";
import * as CityCaptureSystem from "./Systems/cityCapture";
import * as FogOfWarSystem from "./Systems/FogOfWar/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as Pathfinding from "./Systems/Pathfinding";
import * as AISystem from "../../Systems/AI/AI";
import { EmoteSystem_init } from "../../Systems/Chara/Emote";
import * as StaminaBarSystem from "../../Systems/Chara/StaminaBar";
import * as CharaFaceDirection from "../../Systems/Chara/FaceDirection";
import * as MovementArrows from "../../Systems/Chara/MovementArrow";
import * as EntitySelection from "../../Systems/EntitySelection/EntitySelection";
import * as CharaMovement from "../../Systems/Chara/SquadMovement";
import * as RangedAttackDisplay from "./Systems/RangedAttackDisplay";
import * as CharaSquadMovedIntoCell from "../../Systems/Chara/Events/SQUAD_MOVED_INTO_CELL";

import { TURN_DURATION } from "../../config";
import { createFowLayer } from "./Systems/FogOfWar/createFowLayer";
import { DestinationDisplaySystem_init } from "./Systems/DestinationDisplay";
import { getDirection } from "../../Models/Direction";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";

export class BattlegroundScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics | null = null;
  charas: Chara[] = [];
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  isPaused = true;
  isSelectingSquadMove = false;
  cities: { city: City; sprite: Phaser.GameObjects.Image }[] = []; // TODO: data duplication, this should be just a list of sprites
  tilemap: Phaser.Tilemaps.Tilemap | null = null;
  fow: Phaser.Tilemaps.TilemapLayer | null = null;
  grid: (0 | 1)[][] = []

  cleanup() {
    this.charas.forEach(chara => {
      chara.group?.destroy(true, true)
      chara.sprite?.destroy()
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
    this.isPaused = true;
    this.isSelectingSquadMove = false;
    this.time.removeAllEvents();
    this.fow?.destroy()
    this.fow = null
    this.grid = []
  }

  constructor() {
    super("BattlegroundScene");

    const state = getState();

    listeners([
      [signals.PAUSE_GAME, this.pauseGame],
      [signals.RESUME_GAME, this.resumeGame],
      [
        signals.SELECT_SQUAD_MOVE_START,
        () => {
          this.isSelectingSquadMove = true;
        },
      ],
      [signals.SELECT_SQUAD_MOVE_DONE, this.moveUnitsTo],
      [
        signals.SELECT_SQUAD_MOVE_CANCEL,
        () => {
          this.isSelectingSquadMove = false;
        },
      ],
      [
        signals.BATTLEGROUND_TICK,
        () => {
          processTick(this);
        },
      ],
      [
        signals.UNIT_CREATED,
        (unitId: string) => {
          const unit = this.getSquad(unitId)

          this.renderUnit(unit)

        }
      ]
    ]);


    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    squadDestroyed(this, state);
    VictorySystem.init(state);
    AISystem.init(state);
    EmoteSystem_init(state, this);
    FogOfWarSystem.init(this, state);
    CityCaptureSystem.init(this);
    CursorSystem.init(this);
    CharaFaceDirection.init(this);
    Pathfinding.init(this);
    StaminaRegen.init(state);
    MovementArrows.init(state, this);
    EntitySelection.init(state);
    CharaMovement.init(state);
    RangedAttackDisplay.init(this, state);
    CharaSquadMovedIntoCell.init(this, state);
    StaminaBarSystem.init(state, this);
    DestinationDisplaySystem_init(state, this);
    BattlegroundAudioSystem_init(state, this);

    //@ts-ignore
    window.bg = this;
  }

  preload = preload;
  create = (state: State) => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    console.log("BattlegroundScene create");
    const { map, layers } = createMap(this);
    if (state.gameData.squads.length > 0) {
      console.log("BattlegroundScene create with gameData: ", state.gameData)
    } else {
      importMapObjects(map);
    }

    this.layers = layers;
    this.tilemap = map;
    this.cities = createCities(this, state.gameData.cities);
    this.createMapSquads();

    makeMapInteractive(this, map, layers.background);
    //makeSquadsInteractive(this, this.charas);
    makeCitiesInteractive(
      this,
      this.cities
    );

    this.fow = createFowLayer(this)

    this.grid = layers.obstacles.layer.data.map((row) =>
      row.map((tile) => (tile.index === -1 ? 0 : 1))
    );

    ControlsSystem.init(this);


    this.createEmotes()

    this.startTicks(state);

    //@ts-ignore
    window.scene = this;

    emit(signals.BATTLEGROUND_STARTED);
    console.log("BattlegroundScene create done");
  };

  createEmotes() {

  }

  getChara = (id: string) => {
    const chara = this.charas.find((chara) => chara.id === id);
    if (!chara) throw new Error(this.errors.charaNotFound(id));
    return chara;
  };

  getSquad = (id: string) => {
    return getSquad(getState())(id)
  };

  getCity = (id: string) => {
    const city = this.cities.find((city) => city.city.id === id);
    if (!city) throw new Error(this.errors.cityNotFound(id));
    return city;
  }

  getTileAt = (vec: Vec2) => {
    const tile = this.layers?.background.getTileAt(vec.x, vec.y);
    if (!tile) throw new Error(this.errors.noTileAt(vec));
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

  private startTicks(state: State) {
    this.time.addEvent({
      delay: TURN_DURATION / state.options.speed,
      callback: () => {
        if (state.gameData.winner && !this.scene.isPaused()) {
          this.scene.pause();
          this.time.removeAllEvents();
          return;
        }

        if (!this.isPaused) {
          state.gameData.tick++;
          emit(signals.BATTLEGROUND_TICK, state.gameData.tick);
        }
      },
      loop: true,
    });
  }

  createMapSquads() {
    getState().gameData.squads
      .filter((unit) => unit.status.type !== UNIT_STATUS_KEYS.DESTROYED)
      .forEach((unit) => this.renderUnit(unit));
  }

  renderUnit(unit: Unit) {
    const chara = createChara(
      this,
      unit,
    )

    this.charas.push(chara)

    emit(signals.CHARA_CREATED, unit.id)

    makeSquadInteractive(chara, this)

  }

  pauseGame = () => {
    this.isPaused = true;
  };
  resumeGame = () => {
    this.isPaused = false;
  };
  moveUnitsTo = (sqdIds: string[], { x, y }: Vec2) => {
    const units = getState().gameData.squads.filter((sqd) => sqdIds.includes(sqd.id));

    this.isSelectingSquadMove = false;

    units.forEach((squad) => {
      emit(signals.LOOKUP_PATH, squad.id, squad.position, vec2(x, y));
    });
  };

  errors = {
    noTileAt: ({ x, y }: Vec2) => `no tile at ${x}, ${y}`,
    squadNotFound: (id: string) => `squad ${id} not found`,
    cityNotFound: (id: string) => `city ${id} not found`,
    charaNotFound: (id: string) => `chara ${id} not found`,
    errorCreatingTileset: (tilesetName: string) => `error creating tileset ${tilesetName}`,
    errorCreatingTilemapLayer: (layerName: string) => `error creating tilemap layer ${layerName}`,
  };
}

export default BattlegroundScene;
