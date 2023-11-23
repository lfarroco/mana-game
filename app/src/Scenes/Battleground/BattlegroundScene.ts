import Phaser from "phaser";
import { preload } from "./preload";
import { createMap } from "./Map/createMap";
import { BGState, initialState } from "./BGState";
import { importMapObjects } from "./Map/importMapObjects";
import { makeMapInteractive } from "./Map/makeMapInteractive";
import { createMapSquads } from "./Map/createMapSquads";
import * as Easystar from "easystarjs"
import { makeSquadsInteractive } from "./Map/makeSquadsInteractive";
import { createCities } from "./Map/createCities";
import { makeCitiesInteractive } from "./Map/makeCitiesInteractive";
import { Squad } from "../../Models/Squad";
import moveSquads from "./Map/moveSquads";
import * as Signals from "../../Models/Signals";

const easystar = new Easystar.js();
easystar.setAcceptableTiles([0])

export class BattlegroundScene extends Phaser.Scene {
  state: BGState;
  graphics: Phaser.GameObjects.Graphics | null = null;
  path = { t: 0, vec: new Phaser.Math.Vector2() }
  points: Phaser.Math.Vector2[] = []
  curve: Phaser.Curves.Spline | null = null;
  grid: number[][] = []
  layers: {
    background: Phaser.Tilemaps.TilemapLayer;
    obstacles: Phaser.Tilemaps.TilemapLayer;
    features: Phaser.Tilemaps.TilemapLayer;
  } | null = null;
  selectedEntity: Phaser.Types.Physics.Arcade.ImageWithDynamicBody | null = null;
  isPaused = false;
  isSelectingSquadMove = false;

  constructor() {
    super("BattlegroundScene");
    this.state = initialState

    Signals.listeners([
      [Signals.index.PAUSE_PHYSICS, this.pausePhysics],
      [Signals.index.RESUME_PHYSICS, this.resumePhysics],
      [Signals.index.SQUAD_SELECTED, this.selectSquad],
      [Signals.index.SELECT_SQUAD_MOVE_START, () => { this.isSelectingSquadMove = true }],
      [Signals.index.SELECT_SQUAD_MOVE_DONE, this.moveSquadTo],
      [Signals.index.SELECT_SQUAD_MOVE_CANCEL, () => { this.isSelectingSquadMove = false }],
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
    const squads = createMapSquads(this, map)

    makeSquadsInteractive(this, squads)
    makeCitiesInteractive(this, cities)

    layers.obstacles.setCollisionBetween(0, 1000);
    this.physics.add.collider(squads, layers.obstacles);

    this.grid = layers.obstacles.layer.data.map(row => row.map(tile => tile.index === -1 ? 0 : 1))
    easystar.setGrid(this.grid);

    //@ts-ignore
    window.scene = this
  }
  update() {
    if (!this.isPaused) {
      moveSquads(this)
    }
  }

  selectSquad = (id: string) => {
    this.state.selectedEntity = { type: "squad", id }
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
      (path) => {
        if (path.length < 1) return
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
  moveSquadTo = (sqdId: string, { x, y }: { x: number, y: number }) => {
    const sqd = this.state.squads.find(sqd => sqd.id === sqdId)
    const tile = this.layers?.background.getTileAt(x, y);
    if (!sqd || !tile) return
    this.isSelectingSquadMove = false;
    this.moveTo(sqd, tile)
  }
}

export default BattlegroundScene;


