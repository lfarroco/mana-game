import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { createMapSquads } from "./Map/createMapSquads";
import { makeSquadInteractive, makeSquadsInteractive } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import moveSquads from "./Map/moveSquads";
import { faceDirection } from "../../Models/Direction";
import { getDirection } from "../../Models/Direction";
import { Vec2, asVec2, vec2 } from "../../Models/Geometry";
import { Chara, createChara, removeEmote } from "../../Components/Chara";
import { emit, events, listeners } from "../../Models/Signals";
import { State, getState, updateSquad } from "../../Models/State";
import { TILE_HEIGHT, TILE_WIDTH } from "./constants";
import * as EngagementSystem from "../../Systems/Engagement/Engagement";
import * as CombatSystem from "../../Systems/Combat/Combat";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as MoraleRegen from "../../Systems/MoraleRegen/MoraleRegen";
import * as StaminaRegen from "../../Systems/StaminaRegen/StaminaRegen";
import * as VictorySystem from "../../Systems/Victory/Victory";
import { squadDestroyed } from "./Events/SquadDestroyed";
import { City } from "../../Models/City";
import * as CityCaptureSystem from "./Systems/cityCapture";
import * as FogOfWarSystem from "./Systems/FogOfWar";
import * as CursorSystem from "./Systems/Cursor";
import * as Pathfinding from "./Systems/Pathfinding";
import * as AISystem from "../../Systems/AI/AI";
import { TURN_DURATION } from "../../config";


export class BattlegroundScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics | null = null;
  grid: number[][] = []
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
  counters: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("BattlegroundScene");

    listeners([
      [events.PAUSE_PHYSICS, this.pauseGame],
      [events.RESUME_PHYSICS, this.resumeGame],
      [events.SQUAD_SELECTED, this.selectSquad],
      [events.CITY_SELECTED, this.selectCity],
      [events.SELECT_SQUAD_MOVE_START, () => { this.isSelectingSquadMove = true }],
      [events.SELECT_SQUAD_MOVE_DONE, this.moveSquadTo],
      [events.SELECT_SQUAD_MOVE_CANCEL, () => { this.isSelectingSquadMove = false }],
      [events.DISPATCH_SQUAD, this.dispatchSquad],
      [events.SKIRMISH_ENDED, (winner: string, loser: string) => {
        this.scene.wake();
      }],
      [events.BATTLEGROUND_TICK, (tick: number) => {
        if (!this.isPaused) {
          moveSquads(this)
        }
      },
      ],
      [
        events.UPDATE_SQUAD, (squadId: string, sqd: Partial<Squad>) => {

          if (sqd.stamina === 0) {
            emit(events.SQUAD_DESTROYED, squadId)
          }

          updateSquad(this.state)(squadId)(sqd)

        }
      ],
      [events.PATH_FOUND, (key: string, path_: Vec2[]) => {

        const squad = this.state.squads.find(sqd => sqd.id === key)
        if (!squad) {
          console.warn("squad not found", key)
          return
        }


        // in case of choosing own cell
        if (path_.length === 0) {

          emit(events.UPDATE_SQUAD, squad.id, { path: [] })
          if (squad.status === SQUAD_STATUS.MOVING) {
            emit(events.UPDATE_SQUAD, squad.id, { status: SQUAD_STATUS.IDLE })
          }

          const chara = this.charas.find(c => c.id === squad.id);
          if (chara) removeEmote(chara)

          return

        }

        const path = path_.slice(1)

        emit(events.UPDATE_SQUAD, squad.id, { path })
        emit(events.UPDATE_SQUAD, squad.id, { status: SQUAD_STATUS.MOVING })

        const chara = this.charas.find(c => c.id === squad.id);

        if (chara) {
          const direction = getDirection(asVec2(path[0]), squad.position)
          faceDirection(direction, chara)
        }
      }
      ], [
        events.UPDATE_UNIT_COUNTER, (count: number, vec: Vec2) => {
          this.updateUnitCounter(count, vec)
        }
      ], [
        events.BATTLEGROUND_TICK, () => {
          const orphanCounters = this.counters.filter(c =>
            !this.state.squads.find(s => c.name === `${s.position.x},${s.position.y}`))
          orphanCounters.forEach(c => c.parentContainer.destroy())
          this.counters = this.counters.filter(c => !orphanCounters.includes(c))
        }
      ]

    ]
    );

    this.state = getState()

    EngagementSystem.init(this, this.state)
    CombatSystem.init(this.state)
    MoraleRegen.init(this.state)
    StaminaRegen.init(this.state)
    squadDestroyed(this)
    VictorySystem.init(this)
    AISystem.init()


    //@ts-ignore
    window.state = this.state

    //@ts-ignore
    window.bg = this
  }
  updateUnitCounter(count: number, vec: Vec2) {

    const tile = this.layers?.background.getTileAt(vec.x, vec.y)

    if (!tile) return

    const name = `${vec.x},${vec.y}`

    const text = this.counters.find(c => c.name === name) || null

    if (!text) {

      if (count === 1) return

      const x = vec.x * TILE_WIDTH + 4
      const y = vec.y * TILE_HEIGHT + TILE_HEIGHT / 2 + 4

      const container = this.add.container(x, y)
      // rect
      const bg = this.add.rectangle(6, 6, TILE_WIDTH / 3, TILE_HEIGHT / 3, 0x2200aa)
      const newText = this.add.text(
        0,
        0,
        count.toString())

      container.add([bg, newText])
      newText.setName(name)
      this.counters.push(newText)
      this.children.bringToTop(newText)
      return
    }

    if (text.text === count.toString()) return

    if (count === 1) {

      text.parentContainer.destroy()
      this.counters = this.counters.filter(c => c.name !== name)
    }
    else text.setText(count.toString())



  }

  preload = preload;
  create = () => {
    console.log("BattlegroundScene create")
    const { map, layers } = createMap(this);

    ControlsSystem.init(this)

    if (!this.layers)
      importMapObjects(this.state, map);

    this.tilemap = map;

    makeMapInteractive(this, map, layers.background)

    this.layers = layers



    this.cities = createCities(this, this.state.cities)
    this.charas = createMapSquads(this)

    FogOfWarSystem.init(this);
    CityCaptureSystem.init(this);
    CursorSystem.init(this);

    makeSquadsInteractive(this, this.charas)
    makeCitiesInteractive(this, this.cities.map(c => c.sprite))

    this.grid = layers.obstacles.layer.data.map(row => row.map(tile => tile.index === -1 ? 0 : 1))
    Pathfinding.init(this.grid)

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

    if (this.input.mouse) {
      this.input.mouse.disableContextMenu();
    }

    //@ts-ignore
    window.scene = this
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
  dispatchSquad = (sqdId: string, cityId: string) => {

    let squad = this.state.squads.find(sqd => sqd.id === sqdId)
    const city = this.state.cities.find(c => c.id === cityId)

    if (!squad || !city) {
      console.error("dispatchSquad: squad or city not found")
      return
    }

    const tile = this.layers?.background.getTileAtWorldXY(city.screenPosition.x, city.screenPosition.y);
    if (!tile) return

    emit(events.UPDATE_SQUAD, sqdId, { status: SQUAD_STATUS.IDLE, })
    emit(events.UPDATE_SQUAD, sqdId, { position: asVec2(tile) })

    const chara_ = createChara(
      this,
      squad,
    )

    this.charas.push(chara_)

    makeSquadInteractive(chara_, this)

  }
}

export default BattlegroundScene;



