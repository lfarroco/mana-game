import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import * as UIManager from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import { CardCollection } from "../../Models/Entities/Card";
import { PartyBoard, getSharedPlayerBoard } from "../../Models/Board";
import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { popText } from "../../Systems/Chara/Animations/popText";
import { RunCombatSystem } from "./RunCombatIO";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { getOption } from "../../Models/OptionsStore";
import { GameError } from "../../Types/CommonTypes";
import { battleResultAnimation } from "./battleResultAnimation";
import * as BattlegroundScenePure from "./BattlegroundScene.pure";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import * as AudioManager from "../../Systems/AudioManager";
import * as Shop from "./Systems/Shop/Shop";
import * as MoraleDisplay from "./MoraleDisplay";

export let scene: BattlegroundScene;

export class BattlegroundScene extends Phaser.Scene {
  private headless: boolean = false;
  state: State;
  bgContainer!: Phaser.GameObjects.Container;
  cloudsBackground!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  playerBoard!: PartyBoard;
  runCombatSystem: RunCombatSystem;
  battleProgressionSystem: BattleProgressionSystem;

  setupSystem!: BattlegroundSetupSystem;

  cleanup() {
    const cleanupOperations = [
      { name: "clearCharas", operation: () => CharaManager.clearCharas() },
      { name: "removeAllEvents", operation: () => this.time.removeAllEvents() },
      { name: "removeAllChildren", operation: () => this.children.removeAll(true) }
    ];

    BattlegroundScenePure.performCleanup(
      cleanupOperations,
      (operationName: string, error: GameError) => console.error(`Cleanup failed for ${operationName}:`, error)
    );

    const gameObjects = [
      { name: "shopUI", object: Shop.shopUI },
      { name: "setupSystem", object: this.setupSystem }
    ];

    BattlegroundScenePure.destroyGameObjects(
      gameObjects,
      (objectName: string, error: GameError) => console.error(`Failed to destroy ${objectName}:`, error)
    );


    MoraleDisplay.destroy();
    UIManager.destroy();

  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.state = getState();
    this.runCombatSystem = new RunCombatSystem();

  }

  shutdown() {
    console.log("BattlegroundScene shutdown.");
    this.cleanup();
  }

  destroy() {
    console.log("BattlegroundScene destroy.");
    this.cleanup();
  }

  preload = preload;

  init(data: { headless?: boolean } = {}) {
    if (data.headless) {
      this.headless = true;
      console.log("BattlegroundScene init: running in headless (effects-only) mode.");
    }
  }

  create = async () => {
    console.log("BattlegroundScene create: primary logic deferred to start().");
    scene = this;
    this.battleProgressionSystem = new BattleProgressionSystem(this, this.state);
    this.collection = this.cache.json.get("base-collection") as CardCollection;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    const speed = getOption("speed");
    BattlegroundScenePure.configureSceneTime(
      { timeScale: speed, tweenScale: speed },
      (scale: number) => this.time.timeScale = scale,
      (scale: number) => this.tweens.timeScale = scale
    );
    if (this.headless) {
      console.log("BattlegroundScene create: headless mode - skipping start() heavy logic.");
      return;
    }

    this.start();

  }

  start = async () => {
    console.log("BattlegroundScene starting logic...");

    this.setupSystem = new BattlegroundSetupSystem(this);

    this.setupSystem.performOneTimeRuntimeInitialization(this.collection);

    await this.setupSystem.loadDynamicAssets(this.collection)

    this.setupSystem.initializeNewGame(this.state);

    this.playerBoard = this.setupSystem.setupSceneElements(this.state);

    UIManager.createMainUI();

    Shop.init();

    MoraleDisplay.init();

    AudioManager.playMusic('music_battlemap_vetruv');

    this.battleProgressionSystem.transitionToShopPhase();

  }

  handleBattleResultShow(payload: { result: "victory" | "defeat" }): void {
    BattlegroundScenePure.handleBattleResultDisplay(
      payload.result,
      (result: "victory" | "defeat") => battleResultAnimation(this, result)
    );
  }

  handleOwnedUnitSold(payload: { unitId: string, soldForGold: number }): void {
    const { unitId, soldForGold } = payload;

    const chara = CharaManager.getChara(unitId);

    this.state.gameData.player.units = BattlegroundScenePure.handleOwnedUnitSold(
      (amount: number) => updatePlayerGoldIO(amount),
      () => Shop.shopUI.hideSellZone(),
      this.state.gameData.player.units,
      unitId,
      soldForGold,
      chara.container,
      (x: number, y: number, text: string, type: string, direction: string) => {
        popText({
          x,
          y,
          text,
          type: type as "heal" | "damage" | "shield" | "poison" | "timeout",
          direction: direction as "up" | "down" | "left" | "right"
        });
      }
    );
  }

  update(time: number, delta: number): void {
    if (this.headless) {
      return;
    }
    BattlegroundScenePure.updateShopUI(
      time,
      Shop.shopUI,
      (ui, currentTime) => ui.update(currentTime)
    );

    const playerBoard = getSharedPlayerBoard();
    if (playerBoard) {
      playerBoard.update(time);
    }

    this.runCombatSystem.updateFrame(time, delta);
  }
}

export default BattlegroundScene;
