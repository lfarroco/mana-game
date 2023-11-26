import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { BGState, initialState } from "./BGState";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { createMapSquads } from "./Map/createMapSquads";
import * as Easystar from "easystarjs"
import { makeSquadInteractive, makeSquadsInteractive } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { Squad } from "../../Models/Squad";
import moveSquads from "./Map/moveSquads";
import { WindowVec } from "../../Models/Misc";
import { Chara, chara } from "./chara";
import { emit, index, listeners } from "../../Models/Signals";
import { FORCE_ID_CPU, FORCE_ID_PLAYER } from "../../Models/Force";

const easystar = new Easystar.js();
easystar.setAcceptableTiles([0])

export class BattlegroundScene extends Phaser.Scene {
  state: BGState;
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
  isSelectingSquadMove = false;
  squadCollider: Phaser.Physics.Arcade.Collider | null = null;
  layerCollider: Phaser.Physics.Arcade.Collider | null = null;

  constructor() {
    super("BattlegroundScene");
    this.state = initialState

    listeners([
      [index.PAUSE_PHYSICS, this.pausePhysics],
      [index.RESUME_PHYSICS, this.resumePhysics],
      [index.SQUAD_SELECTED, this.selectSquad],
      [index.CITY_SELECTED, this.selectCity],
      [index.SELECT_SQUAD_MOVE_START, () => { this.isSelectingSquadMove = true }],
      [index.SELECT_SQUAD_MOVE_DONE, this.moveSquadTo],
      [index.SELECT_SQUAD_MOVE_CANCEL, () => { this.isSelectingSquadMove = false }],
      [index.DISPATCH_SQUAD, this.dispatchSquad],
    ]);


    //@ts-ignore
    window.state = this.state
  }

  preload = preload;
  create = () => {
    const { map, layers } = createMap(this);

    importMapObjects(this.state, map);

    makeMapInteractive(this, map, layers.background)

    this.layers = layers

    const cities = createCities(this, this.state.cities)
    this.charas = createMapSquads(this, map)

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
    this.squadCollider = this.physics.add.overlap(bodiesA, bodiesB,
      //@ts-ignore
      (squadA: Phaser.GameObjects.Image, squadB: Phaser.GameObjects.Image) => {
        emit(index.SQUADS_COLLIDED, squadA.name, squadB.name);
      }
    );

    if (!this.layers?.obstacles) {
      throw new Error("obstacles layer not found")
    }
    this.layerCollider?.destroy();
    this.layerCollider = this.physics.add.collider(
      bodiesA.concat(bodiesB),
      this.layers.obstacles
    );
    this.layers.obstacles.setCollisionBetween(0, 1000);
  }

  update() {
    if (!this.isPaused) {
      moveSquads(this)
    }
  }

  selectSquad = (id: string) => {
    this.state.selectedEntity = { type: "squad", id }
  }
  selectCity = (id: string) => {
    this.state.selectedEntity = { type: "city", id }
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

  drawLine(path: { x: number, y: number }[]) {
    this.graphics = this.add.graphics();

    this.path = { t: 0, vec: new Phaser.Math.Vector2() };

    this.points = [];

    path.forEach(({ x, y }) => {

      const tile = this.layers?.background.getTileAt(x, y);

      if (!tile) return

      this.points.push(new Phaser.Math.Vector2(
        tile.pixelX + tile.width / 2,
        tile.pixelY + tile.height / 2
      ))

    })

    this.curve = new Phaser.Curves.Spline(this.points);

    const points = this.curve.getPoints(this.points.length * 5);
    this.drawPoints(points)

  }

  moveTo(squad: Squad, target: Phaser.Tilemaps.Tile) {
    const sourceTile = this.layers?.background.getTileAtWorldXY(squad.position.x, squad.position.y);
    if (!sourceTile) return

    this.findPath(
      { x: sourceTile.x, y: sourceTile.y },
      { x: target.x, y: target.y },
      (path_) => {
        if (path_.length < 2) return

        const path = path_.slice(1)

        console.log("setting path", path)
        squad.path = path
        this.drawLine(path)
      }
    )
  }

  repel(
    spriteA: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
    spriteB: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
  ) {

    this.scene.scene.physics.moveToObject(spriteB, spriteA);
    spriteB.body.velocity.x = -spriteB.body.velocity.x;
    spriteB.body.velocity.y = -spriteB.body.velocity.y;

    this.time.addEvent({
      delay: 500,
      callback: () => {
        spriteB.body.setVelocity(0, 0);
      }
    });
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

    const sprite = chara(city.position.x, city.position.y, this, squad)
    squad.dispatched = true;
    squad.position = city.position;
    makeSquadInteractive(sprite, this)

    this.charas.push({
      id: squad.id,
      force: squad.force,
      body: sprite.body,
    })

    this.setupCollisions();

  }
}

export default BattlegroundScene;


