import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { createMapSquads } from "./Map/createMapSquads";
import * as Easystar from "easystarjs"
import { makeSquadInteractive, makeSquadsInteractive } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { SQUAD_STATUS, Squad } from "../../Models/Squad";
import moveSquads from "./Map/moveSquads";
import { faceDirection } from "../../Models/Direction";
import { getDirection } from "../../Models/Direction";
import { BoardVec, WindowVec, asBoardVec } from "../../Models/Misc";
import { Chara, createChara } from "../../Components/chara";
import { emit, events, listeners } from "../../Models/Signals";
import { State, getState } from "../../Models/State";
import { TILE_HEIGHT } from "./constants";
import { createFogOfWar } from "./Map/fogOfWar";
import * as EngagementSystem from "../../Systems/Engagement/Engagement";
import * as CombatSystem from "../../Systems/Combat/Combat";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as MoraleRegen from "../../Systems/MoraleRegen/MoraleRegen";
import { squadDestroyed } from "./Events/SquadDestroyed";

const easystar = new Easystar.js();
easystar.setAcceptableTiles([0])

export class BattlegroundScene extends Phaser.Scene {
  tick: number = 0;
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
  squadsCanMove: boolean = true;
  cursor: Phaser.GameObjects.Image | null = null;
  state: State;
  cities: Phaser.GameObjects.Image[] = []
  tilemap: Phaser.Tilemaps.Tilemap | null = null;

  constructor() {
    super("BattlegroundScene");

    listeners([
      [events.PAUSE_PHYSICS, this.pausePhysics],
      [events.RESUME_PHYSICS, this.resumePhysics],
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
        if (!this.isPaused && this.squadsCanMove) {
          moveSquads(this)
        }
      },
      ], [
        events.UPDATE_SQUAD_MORALE, (squadId: string, morale: number) => {
          const squad = this.state.squads.find(sqd => sqd.id === squadId)
          if (!squad) {
            console.warn("squad not found", squadId)
            return
          }
          squad.morale = morale
        }
      ], [
        events.UPDATE_SQUAD_STAMINA, (squadId: string, stamina: number) => {
          const squad = this.state.squads.find(sqd => sqd.id === squadId)
          if (!squad) {
            console.warn("squad not found", squadId)
            return
          }
          squad.stamina = stamina

          if (squad.stamina <= 0) {
            emit(events.SQUAD_DESTROYED, squadId)
          }
        }
      ]

    ]
    );

    this.state = getState()

    EngagementSystem.init(this, this.state)
    CombatSystem.init(this.state)
    MoraleRegen.init(this)
    squadDestroyed(this)

    //@ts-ignore
    window.state = this.state

    //@ts-ignore
    window.bg = this
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

    this.cursor = this.add.image(0, 0, "cursor")
      .setScale(0.2)
      .setTint(0x00ff00)
      .setVisible(false)

    this.cities = createCities(this, this.state.cities)
    this.charas = createMapSquads(this)

    createFogOfWar(this);

    makeSquadsInteractive(this, this.charas)
    makeCitiesInteractive(this, this.cities)

    this.grid = layers.obstacles.layer.data.map(row => row.map(tile => tile.index === -1 ? 0 : 1))
    easystar.setGrid(this.grid);

    this.time.addEvent({
      delay: 1000 / this.state.speed,
      callback: () => {

        if (!this.isPaused) {
          this.tick++
          emit(events.BATTLEGROUND_TICK, this.tick)
        }

      },
      loop: true
    });

    //@ts-ignore
    window.scene = this
  }

  update() {

    // TODO: make cursor independent of this scene
    if (this.selectedEntity) {
      this.cursor?.setPosition(this.selectedEntity.x, this.selectedEntity.y + TILE_HEIGHT / 5).setVisible(true)
    } else {
      this.cursor?.setVisible(false)
    }
  }

  selectSquad = (id: string) => {
    this.state.selectedEntity = { type: "squad", id }
    this.selectedEntity = this.charas.find(c => c.id === id)?.sprite || null
  }
  selectCity = (id: string) => {
    this.state.selectedEntity = { type: "city", id }
    this.selectedEntity = this.children.getByName(id) as Phaser.GameObjects.Sprite
  }

  findPath(
    source: { x: number; y: number; },
    target: { x: number; y: number; },
    callback: ((path: { x: number; y: number; }[]) => void)
  ) {

    easystar.findPath(source.x, source.y, target.x, target.y, callback);
    easystar.calculate();
  }

  drawPoints(points: Phaser.Math.Vector2[]) {

    if (!this.graphics) return

    this.graphics.clear();
    this.graphics.lineStyle(5, 0xff0000, 3);
    const interval = 20;
    let time = 0;
    for (let i = 1; i < points.length; i++) {
      this.time.addEvent({
        delay: time,
        callback: () => {

          if (!this.graphics) return
          this.graphics.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
      });
      time += interval;
    }

  }


  moveTo(squad: Squad, target: BoardVec) {
    const sourceTile = this.layers?.background.getTileAt(
      squad.position.x,
      squad.position.y,
    );
    if (!sourceTile) return

    this.findPath(
      { x: sourceTile.x, y: sourceTile.y },
      { x: target.x, y: target.y },
      (path_) => {
        if (path_.length < 2) return

        const path = path_.slice(1)

        console.log("setting path", path)
        squad.path = path
        const chara = this.charas.find(c => c.id === squad.id);

        if (chara) {
          const direction = getDirection(asBoardVec(path[0]), squad.position)
          faceDirection(direction, chara)
        }
      }
    )
  }

  pausePhysics = () => {
    this.isPaused = true;
  }
  resumePhysics = () => {
    this.isPaused = false;
  }
  moveSquadTo = (sqdId: string, { x, y }: WindowVec) => {
    const sqd = this.state.squads.find(sqd => sqd.id === sqdId)
    const tile = this.layers?.background.getTileAtWorldXY(x, y);
    if (!sqd || !tile) return
    this.isSelectingSquadMove = false;
    this.moveTo(sqd, asBoardVec(tile))
  }
  dispatchSquad = (sqdId: string, cityId: string) => {

    let squad = this.state.squads.find(sqd => sqd.id === sqdId)
    const city = this.state.cities.find(c => c.id === cityId)

    if (!squad || !city) {
      console.error("dispatchSquad: squad or city not found")
      return
    }
    squad.status = SQUAD_STATUS.IDLE

    const tile = this.layers?.background.getTileAtWorldXY(city.position.x, city.position.y);
    if (!tile) return
    squad.position = asBoardVec(tile)

    const chara_ = createChara(
      this,
      squad,
    )

    this.charas.push(chara_)

    makeSquadInteractive(chara_, this)

  }
}

export default BattlegroundScene;



