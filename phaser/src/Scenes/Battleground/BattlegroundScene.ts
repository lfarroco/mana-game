import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { UIManager } from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import { CardCollection } from "../../Models/Entities/Card";
import { PartyBoard, getSharedPlayerBoard } from "../../Models/Board";
import { Shop } from "./Systems/Shop/Shop";
import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { BattlegroundEventSystem } from "./Systems/BattlegroundEventSystem";
import { popText } from "../../Systems/Chara/Animations/popText";
import { RunCombatSystem } from "./RunCombatIO";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { getOption } from "../../Models/OptionsStore";
import { Unit } from "../../Models/Entities/Unit";
import { Vec2 } from "../../Models/Geometry";
import { GameError } from "../../Types/CommonTypes";
import { battleResultAnimation } from "./battleResultAnimation";
import * as BattlegroundScenePure from "./BattlegroundScene.pure";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import * as AudioManager from "../../Systems/AudioManager";


export let scene: BattlegroundScene;
/**
 * The main scene for the battleground, handling game logic, UI, and progression.
 * It orchestrates the shop phase, combat phase, and interactions between various game systems.
 */
export class BattlegroundScene extends Phaser.Scene {
  /** The global game state. */
  state: State;
  /** Container for background elements. Set by SetupSystem */
  bgContainer!: Phaser.GameObjects.Container;
  /** The background image of the scene. Set by SetupSystem */
  cloudsBackground!: Phaser.GameObjects.Image;
  /** The current card collection being used. */
  collection!: CardCollection;
  /** Manages UI elements within the scene. */
  uiManager!: UIManager;
  /** Represents the player's board and handles unit placement. */
  playerBoard!: PartyBoard; // Initialized in create/start
  /** System responsible for running the combat simulation. */
  runCombatSystem: RunCombatSystem;
  /** System responsible for managing battle progression (shop, combat, game over). */
  battleProgressionSystem: BattleProgressionSystem;
  /** The shop system, allowing players to buy units */
  shop: Shop;

  // New Systems
  setupSystem!: BattlegroundSetupSystem;
  eventSystem!: BattlegroundEventSystem;

  /** Cleans up resources and event listeners. */
  cleanup() {
    // Use pure function for safe cleanup operations
    const cleanupOperations = [
      { name: "clearCharas", operation: () => CharaManager.clearCharas() },
      { name: "removeAllEvents", operation: () => this.time.removeAllEvents() },
      { name: "removeAllChildren", operation: () => this.children.removeAll(true) }
    ];

    BattlegroundScenePure.performCleanup(
      cleanupOperations,
      (operationName: string, error: GameError) => console.error(`Cleanup failed for ${operationName}:`, error)
    );

    // Use pure function for safe destruction of game objects
    const gameObjects = [
      { name: "uiManager", object: this.uiManager },
      { name: "shopUI", object: this.shop?.shopUI },
      { name: "eventSystem", object: this.eventSystem },
      { name: "setupSystem", object: this.setupSystem }
    ];

    BattlegroundScenePure.destroyGameObjects(
      gameObjects,
      (objectName: string, error: GameError) => console.error(`Failed to destroy ${objectName}:`, error)
    );

    // Note: Shop, RunCombatSystem, BattleProgressionSystem might need destroy methods
    // if they acquire resources or set up listeners not tied to scene.events.
  }

  /** Constructs the BattlegroundScene. */
  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.state = getState();
    // Initialize systems that are core to the scene's operation or have early dependencies
    this.runCombatSystem = new RunCombatSystem(this);
    // this.shop, this.uiManager, this.setupSystem, this.eventSystem will be initialized in start()

    BattlegroundAudioSystem_init(this.state, this);
    CharaManager.init(this);

  }

  /** Phaser scene lifecycle method called when the scene is shut down. */
  shutdown() {
    console.log("BattlegroundScene shutdown.");
    this.cleanup();
  }

  /** Phaser scene lifecycle method called when the scene is destroyed (never to be resumed). */
  destroy() {
    console.log("BattlegroundScene destroy.");
    this.cleanup();
  }

  /** Phaser scene lifecycle method for preloading assets. */
  preload = preload;

  /**
   * Phaser scene lifecycle method called once when the scene is created.
   * Loads initial JSON data. Dynamic asset loading and full setup is deferred to `start()`.
   */
  create = async () => {
    console.log("BattlegroundScene create: primary logic deferred to start().");
    scene = this;
    this.battleProgressionSystem = new BattleProgressionSystem(this, this.state);
    this.collection = this.cache.json.get("base-collection") as CardCollection;

    // Ensure cleanup logic fires for both shutdown and destroy lifecycle events
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    const speed = getOption("speed");
    BattlegroundScenePure.configureSceneTime(
      { timeScale: speed, tweenScale: speed },
      (scale: number) => this.time.timeScale = scale,
      (scale: number) => this.tweens.timeScale = scale
    );

    this.start();

  }

  /**
   * Main starting point for the scene's logic after assets are loaded (called by `create`).
   * It initializes UI, game state for a new game, sets up scene elements and event listeners,
   * and transitions to the first shop phase.
   */
  start = async () => {
    console.log("BattlegroundScene starting logic...");

    // Instantiate systems that depend on the scene context fully available
    this.setupSystem = new BattlegroundSetupSystem(this);
    this.shop = new Shop(this);
    this.uiManager = new UIManager(this); // UIManager sets up its own UI event listeners

    // 1. Perform one-time runtime data initialization
    this.setupSystem.performOneTimeRuntimeInitialization(this.collection);

    // 2. Load dynamic assets (card images defined on the collection)
    await this.setupSystem.loadDynamicAssets(this.collection)

    // 3. Initialize game state for a new game
    this.setupSystem.initializeNewGame(this.state);

    // 4. Setup static scene elements (background, player board, initial UI)
    this.playerBoard = this.setupSystem.setupSceneElements(this.state);

    // 5. Initialize and register core game event listeners
    this.eventSystem = new BattlegroundEventSystem(this);
    this.eventSystem.registerEventHandlers();

    // 6. Create initial UI and board setup
    this.uiManager.createMainUI();

    // 7. Start battle music
    AudioManager.playMusic('music_battlemap_vetruv');

    // 8. Setup Trait System event listeners
    //(removed)

    // 9. Start the game flow
    this.battleProgressionSystem.transitionToShopPhase(); // Initial call, no enemies defeated

    // Initialize DebugController after all systems are set up
    if (process.env.NODE_ENV === 'development') {
      // Dynamically import DebugController only in development
      import("../Debug/DebugController").then(({ DebugController }) => {
        window.gameController = new DebugController(this);
        console.log("BattlegroundScene: DebugController dynamically loaded and initialized.");
      }).catch(error => {
        console.error("BattlegroundScene: Failed to load DebugController", error);
      });
    }
  }


  handleOwnedUnitMoveRequest(payload: { unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
    const { unitId, targetTile, dragStartX, dragStartY } = payload;

    // Use the new functional approach with organized parameters
    BattlegroundScenePure.handleUnitMoveRequest(
      // Movement State - the core data
      {
        units: this.state.gameData.player.units,
        unitId,
        targetTile,
        dragStartX,
        dragStartY
      },
      // Movement Services - pure functions and utilities
      {
        updateUnitPosition: (unit: Unit, target: Vec2, units: Unit[]) => PartyBoard.updateUnitPosition(unit, target, units),
        getVisualPosition: (unit: Unit) => CharaManager.getCharaPosition(unit),
        logError: (message: string) => console.error(message)
      },
      // Movement Callbacks - event handlers
      {
        onMoveAccepted: (unitId: string, _newLogicalPosition: Vec2, newVisualPosition: { x: number; y: number; }) => {
          const chara = CharaManager.getChara(unitId);
          chara?.moveToPosition(newVisualPosition);
        },
        onSwapAccepted: (
          movedUnitId: string,
          _movedUnitNewLogicalPosition: Vec2,
          movedUnitVisualPosition: { x: number; y: number; },
          swappedUnitId: string,
          _swappedUnitNewLogicalPosition: Vec2,
          swappedUnitVisualPosition: { x: number; y: number; }
        ) => {
          const movedChara = CharaManager.getChara(movedUnitId);
          const swappedChara = CharaManager.getChara(swappedUnitId);
          movedChara?.moveToPosition(movedUnitVisualPosition);
          swappedChara?.moveToPosition(swappedUnitVisualPosition);
        },
        onMoveRejected: (unitId: string, _reason: string, dragStartX: number, dragStartY: number) => {
          const chara = CharaManager.getChara(unitId);
          chara?.revertToPosition(dragStartX, dragStartY);
        }
      }
    );
  }

  handleBattleResultShow(payload: { result: "victory" | "defeat" }): void {
    BattlegroundScenePure.handleBattleResultDisplay(
      payload.result,
      (result: "victory" | "defeat") => battleResultAnimation(this, result)
    );
  }

  handleOwnedUnitSold(payload: { unitId: string, soldForGold: number }): void {
    const { unitId, soldForGold } = payload;

    // Get Chara instance for position and destruction
    const chara = CharaManager.getChara(unitId);

    // Use the pure function with dependency injection
    this.state.gameData.player.units = BattlegroundScenePure.handleOwnedUnitSold(
      (amount: number) => updatePlayerGoldIO(amount),
      () => this.shop.shopUI.hideSellZone(),
      this.state.gameData.player.units,
      unitId,
      soldForGold,
      chara,
      (x: number, y: number, text: string, type: string, direction: string) => {
        // Use the actual popText function from the Chara system
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
    // Update shop UI to handle magic orb animations using pure function
    BattlegroundScenePure.updateShopUI(
      time,
      this.shop?.shopUI,
      (ui, currentTime) => ui.update(currentTime)
    );

    // Update board slot shader animations
    const playerBoard = getSharedPlayerBoard();
    if (playerBoard) {
      playerBoard.update(time);
    }

    // Forward frame updates to combat system (removes need for events.on('update'))
    this.runCombatSystem.updateFrame(time, delta);
  }
}

export default BattlegroundScene;
