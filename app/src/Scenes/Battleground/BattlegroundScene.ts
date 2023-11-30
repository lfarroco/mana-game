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
import { Squad } from "../../Models/Squad";
import moveSquads from "./Map/moveSquads";
import { WindowVec, windowVec } from "../../Models/Misc";
import { Chara, createChara } from "../../Components/chara";
import { emit, events, listeners } from "../../Models/Signals";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";
import { BGState, getState } from "./BGState";

const easystar = new Easystar.js();
easystar.setAcceptableTiles([0])

export class BattlegroundScene extends Phaser.Scene {
  graphics: Phaser.GameObjects.Graphics | null = null;
  path = { t: 0, vec: new Phaser.Math.Vector2() }
  points: Phaser.Math.Vector2[] = []
  curve: Phaser.Curves.Spline | null = null;
  grid: number[][] = []
  charas: Chara[] = []
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  selectedEntity: Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null = null;
  isPaused = false;
  isSelectingSquadMove = false; // TODO: we can move this into the state
  squadCollider: Phaser.Physics.Arcade.Collider | null = null;
  layerCollider: Phaser.Physics.Arcade.Collider | null = null;
  squadsCanMove: boolean = true;
  cursor: Phaser.GameObjects.Image | null = null;
  state: BGState;

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
      [events.SQUADS_COLLIDED, this.handleSquadsCollided],
      [events.SKIRMISH_ENDED, () => { this.scene.start() }]
    ]);

    this.state = getState()


    //@ts-ignore
    window.state = this.state
  }

  handleSquadsCollided = (squadAId: string, squadBId: string) => {

    this.scene.stop()
    this.scene.start("SkirmishScene")

    this.pausePhysics();
    this.squadsCanMove = false;

    // const squadA = this.charas.find(sqd => sqd.id === squadAId)
    // const squadB = this.charas.find(sqd => sqd.id === squadBId)

    // if (!squadA || !squadB) throw new Error("squad not found")

    // const winner = squadA.force === FORCE_ID_PLAYER ? squadA : squadB
    // const loser = squadA.force === FORCE_ID_CPU ? squadA : squadB

    // this.repel(winner.body, loser.body)
  }

  preload = preload;
  create = () => {
    console.log("BattlegroundScene create")
    const { map, layers } = createMap(this);

    importMapObjects(this.state, map);

    makeMapInteractive(this, map, layers.background)

    this.layers = layers

    this.cursor = this.add.image(0, 0, "cursor").setScale(0.2).setTint(0x00ff00).setVisible(false)

    const cities = createCities(this, this.state.cities)
    this.charas = createMapSquads(this)

    makeSquadsInteractive(this, this.charas)
    makeCitiesInteractive(this, cities)

    this.setupCollisions();

    this.grid = layers.obstacles.layer.data.map(row => row.map(tile => tile.index === -1 ? 0 : 1))
    easystar.setGrid(this.grid);

    //@ts-ignore
    window.scene = this
  }
  private setupCollisions() {
    this.squadCollider?.destroy();
    const bodiesA = this.charas.filter(c => c.force === FORCE_ID_PLAYER).map(({ body }) => body)
    const bodiesB = this.charas.filter(c => c.force === FORCE_ID_CPU).map(({ body }) => body)

    //@ts-ignore
    this.squadCollider = this.physics.add.overlap(bodiesA, bodiesB,
      //@ts-ignore
      (squadA: Phaser.GameObjects.Image, squadB: Phaser.GameObjects.Image) => {
        emit(events.SQUADS_COLLIDED, squadA.name, squadB.name);
      }
    );

    if (!this.layers?.obstacles) {
      throw new Error("obstacles layer not found")
    }
    this.layerCollider?.destroy();
    this.layerCollider = this.physics.add.collider(

      // @ts-ignore
      bodiesA.concat(bodiesB),
      this.layers.obstacles
    );
    this.layers.obstacles.setCollisionBetween(0, 1000);
  }

  update() {
    if (!this.isPaused && this.squadsCanMove) {
      moveSquads(this)
    }
    if (this.selectedEntity) {
      this.cursor?.setPosition(this.selectedEntity.x, this.selectedEntity.y).setVisible(true)
    } else {
      this.cursor?.setVisible(false)
    }
  }

  selectSquad = (id: string) => {
    this.state.selectedEntity = { type: "squad", id }
    this.selectedEntity = this.children.getByName(id) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
  }
  selectCity = (id: string) => {
    this.state.selectedEntity = { type: "city", id }
    this.selectedEntity = this.children.getByName(id) as Phaser.Types.Physics.Arcade.ImageWithDynamicBody
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


  moveTo(squad: Squad, target: Phaser.Tilemaps.Tile) {
    const sourceTile = this.layers?.background.getTileAtWorldXY(
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
      }
    )
  }

  repel(
    spriteA: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
    spriteB: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
  ) {

    this.scene.resume()

    this.charas.forEach(chara => chara.body.setVelocity(0, 0))

    this.scene.scene.physics.moveToObject(spriteB, spriteA, 60);
    spriteB.body.velocity.x = -spriteB.body.velocity.x;
    spriteB.body.velocity.y = -spriteB.body.velocity.y;

    this.time.delayedCall(1000,
      () => {
        spriteB.body.setVelocity(0, 0);
        this.squadsCanMove = true;
      }
    );
  }
  pausePhysics = () => {
    this.isPaused = true;
    this.scene.scene.physics.pause();
  }
  resumePhysics = () => {
    this.isPaused = false;
    this.scene.scene.physics.resume();
  }
  moveSquadTo = (sqdId: string, { x, y }: WindowVec) => {
    const sqd = this.state.squads.find(sqd => sqd.id === sqdId)
    const tile = this.layers?.background.getTileAtWorldXY(x, y);
    if (!sqd || !tile) return
    this.isSelectingSquadMove = false;
    this.moveTo(sqd, tile)
  }
  dispatchSquad = (sqdId: string, cityId: string) => {

    let squad = this.state.squads.find(sqd => sqd.id === sqdId)
    const city = this.state.cities.find(c => c.id === cityId)

    if (!squad || !city) {
      console.error("dispatchSquad: squad or city not found")
      return
    }
    squad.dispatched = true;

    squad.position = windowVec(city.position.x, city.position.y)

    const chara_ = createChara(
      this,
      squad,
    )

    this.charas.push(chara_)

    makeSquadInteractive(chara_, this)
    this.setupCollisions();

  }
}

export default BattlegroundScene;


