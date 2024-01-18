import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { makeSquadsInteractive } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { Squad } from "../../Models/Squad";
import processTick from "./ProcessTick";
import { Vec2, vec2 } from "../../Models/Geometry";
import { Chara } from "../../Components/MapChara";
import { emit, events, listeners } from "../../Models/Signals";
import { State, getState, updateSquad } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as StaminaRegen from "../../Systems/StaminaRegen/StaminaRegen";
import * as VictorySystem from "../../Systems/Victory/Victory";
import { squadDestroyed } from "./Events/SquadDestroyed";
import { City } from "../../Models/City";
import * as CityCaptureSystem from "./Systems/cityCapture";
import * as FogOfWarSystem from "./Systems/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as Pathfinding from "./Systems/Pathfinding";
import * as AISystem from "../../Systems/AI/AI";
import * as EmoteSystem from "../../Systems/Chara/Emote";
import * as CharaMovement from "../../Systems/Chara/SquadMovement";
import * as CharaFaceDirection from "../../Systems/Chara/FaceDirection";
import * as CharaDispatch from "../../Systems/Chara/Dispatch";

import { TURN_DURATION } from "../../config";

export class BattlegroundScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics | null = null;
  charas: Chara[] = []
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  selectedEntity: Phaser.GameObjects.Sprite | null = null;
  isPaused = false;
  isSelectingSquadMove = false; // TODO: we can move this into the state
  state: State;
  cities: { city: City, sprite: Phaser.GameObjects.Image }[] = []
  tilemap: Phaser.Tilemaps.Tilemap | null = null;

  constructor() {
    super("BattlegroundScene");

    listeners([
      [events.PAUSE_GAME, this.pauseGame],
      [events.RESUME_GAME, this.resumeGame],
      [events.SQUAD_SELECTED, this.selectSquad],
      [events.CITY_SELECTED, this.selectCity],
      [events.SELECT_SQUAD_MOVE_START, () => { this.isSelectingSquadMove = true }],
      [events.SELECT_SQUAD_MOVE_DONE, this.moveSquadTo],
      [events.SELECT_SQUAD_MOVE_CANCEL, () => { this.isSelectingSquadMove = false }],
      [events.BATTLEGROUND_TICK, (tick: number) => {
        if (!this.isPaused) {
          processTick(this)
        }
      },
      ],
      [events.UPDATE_SQUAD, (squadId: string, sqd: Partial<Squad>) => {

        if (sqd.stamina === 0) {
          emit(events.SQUAD_DESTROYED, squadId)
        }

        updateSquad(this.state)(squadId)(sqd)

      }
      ]
    ]);

    this.state = getState()

    StaminaRegen.init(this.state)
    squadDestroyed(this)
    VictorySystem.init(this)
    AISystem.init()
    EmoteSystem.init(this)

    //@ts-ignore
    window.state = this.state

    //@ts-ignore
    window.bg = this
  }

  preload = preload;
  create = () => {
    console.log("BattlegroundScene create")
    const { map, layers } = createMap(this);

    importMapObjects(this.state, map);

    CharaDispatch.init(this)
    CharaMovement.init(this.state)

    this.layers = layers
    this.tilemap = map;
    this.cities = createCities(this, this.state.cities)
    this.createMapSquads()

    ControlsSystem.init(this)
    makeMapInteractive(this, map, layers.background)
    FogOfWarSystem.init(this);
    CityCaptureSystem.init(this);
    CursorSystem.init(this);
    CharaFaceDirection.init(this)
    makeSquadsInteractive(this, this.charas)
    makeCitiesInteractive(this, this.cities.map(c => c.sprite))

    const grid = layers.obstacles.layer.data.map(row => row.map(tile => tile.index === -1 ? 0 : 1))
    Pathfinding.init(grid)

    this.time.addEvent({
      delay: TURN_DURATION / this.state.speed,
      callback: () => {

        if (this.state.winner && !this.scene.isPaused()) {
          this.scene.pause()
          this.time.removeAllEvents()
          return
        }

        if (!this.isPaused) {
          this.state.tick++;
          emit(events.BATTLEGROUND_TICK, this.state.tick)
        }

      },
      loop: true
    });

    //@ts-ignore
    window.scene = this
  }

  createMapSquads() {
    this.state.squads
      .forEach(squad =>
        emit(events.DISPATCH_SQUAD, squad.id)
      );
  }

  selectSquad = (id: string) => {
    this.state.selectedEntity = { type: "squad", id }
    this.selectedEntity = this.charas.find(c => c.id === id)?.sprite || null
  }
  selectCity = (id: string) => {
    this.state.selectedEntity = { type: "city", id }
    this.selectedEntity = this.children.getByName(id) as Phaser.GameObjects.Sprite
  }

  pauseGame = () => {
    this.isPaused = true;
  }
  resumeGame = () => {
    this.isPaused = false;
  }
  moveSquadTo = (sqdId: string, { x, y }: Vec2) => {
    const squad = this.state.squads.find(sqd => sqd.id === sqdId)
    const tile = this.layers?.background.getTileAt(x, y);
    if (!squad || !tile) return

    this.isSelectingSquadMove = false;

    emit(events.LOOKUP_PATH, squad.id, squad.position, vec2(x, y))

  }

}

export default BattlegroundScene;



