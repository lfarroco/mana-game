import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { UIManager } from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import { CardCollection } from "../../Models/Entities/Card";
import { PartyBoard } from "../../Models/Board";
import { Shop } from "./Systems/Shop/Shop";
import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { BattlegroundEventSystem } from "./Systems/BattlegroundEventSystem";
import { RunCombatSystem } from "./RunCombatIO";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { GameEvents } from "../../constants/events";
import { getOption } from "../../Models/OptionsStore";
import { Unit } from "../../Models/Entities/Unit";
import { Vec2 } from "../../Models/Geometry";
import { battleResultAnimation } from "./battleResultAnimation";
import { handleOwnedUnitSold as handleOwnedUnitSoldPure, updatePlayerGold as updatePlayerGoldPure, handleUnitMoveRequestPure, playFxSafe, playMusicSafe, handleBattleResultDisplay, performCleanup, destroyGameObjects, configureSceneTime, handleCharacterCreationRequest, createGoldUpdateHandler, updateShopUI } from "./BattlegroundScene.pure";
import { AudioSystem } from "../../Systems/AudioSystem/AudioSystem";


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

    performCleanup(
      cleanupOperations,
      (operationName: string, error: any) => console.error(`Cleanup failed for ${operationName}:`, error)
    );

    // Use pure function for safe destruction of game objects
    const gameObjects = [
      { name: "uiManager", object: this.uiManager },
      { name: "shopUI", object: this.shop?.shopUI },
      { name: "eventSystem", object: this.eventSystem },
      { name: "setupSystem", object: this.setupSystem }
    ];

    destroyGameObjects(
      gameObjects,
      (objectName: string, error: any) => console.error(`Failed to destroy ${objectName}:`, error)
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
    configureSceneTime(
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

    // 6. Emit events for initial UI and board setup now that listeners are active
    this.events.emit(GameEvents.UI_MAIN_CREATE);               // For main UI (sidebar, gold, etc.)

    // 7. Start battle music
    const audioSystem = AudioSystem.getInstance();
    playMusicSafe(
      audioSystem,
      'music_battlemap_vetruv',
      (errorMessage: string) => console.warn(errorMessage)
    );

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

  /**
   * Plays a sound effect using the AudioSystem.
   * @param key - The key of the sound effect to play.
   */
  playFx(key: string) {
    const audioSystem = AudioSystem.getInstance();
    playFxSafe(
      audioSystem,
      key,
      (errorMessage: string) => console.warn(errorMessage)
    );
  }

  // --- Event Handlers Moved from BattlegroundEventSystem ---

  updatePlayerGold(goldDelta: number): void {
    this.state.gameData.player.gold = createGoldUpdateHandler(
      this.state.gameData.player.gold,
      goldDelta,
      updatePlayerGoldPure,
      (event: string, newGold: number, changeAmount: number) => this.events.emit(event, newGold, changeAmount)
    );
  }

  async handleBoardCharaCreateRequest(payload: { unit: Unit }): Promise<void> {
    await handleCharacterCreationRequest(
      payload.unit,
      this.battleProgressionSystem.isInShopPhase,
      (unit: Unit, animate: boolean) => CharaManager.summonChara(unit, animate),
      (event: string, eventPayload: any) => this.events.emit(event, eventPayload)
    );
  }

  handleOwnedUnitMoveRequest(payload: { unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
    const { unitId, targetTile, dragStartX, dragStartY } = payload;

    handleUnitMoveRequestPure(
      this.state.gameData.player.units,
      unitId,
      targetTile,
      dragStartX,
      dragStartY,
      (unit: Unit, target: Vec2, units: Unit[]) => PartyBoard.updateUnitPosition(unit, target, units),
      (unit: Unit) => CharaManager.getCharaPosition(unit),
      (message: string) => console.error(message),
      (eventType: string, payload: any) => this.events.emit(eventType, payload)
    );
  }

  handleBattleResultShow(payload: { result: "victory" | "defeat" }): void {
    handleBattleResultDisplay(
      payload.result,
      (result: "victory" | "defeat") => battleResultAnimation(this, result)
    );
  }

  handleOwnedUnitSold(payload: { unitId: string, soldForGold: number }): void {
    const { unitId, soldForGold } = payload;

    // Get Chara instance for position and destruction
    const chara = CharaManager.getChara(unitId);

    // Use the pure function with dependency injection
    this.state.gameData.player.units = handleOwnedUnitSoldPure(
      (amount: number) => this.updatePlayerGold(amount),
      (event: string, eventPayload: any) => this.events.emit(event, eventPayload),
      () => this.shop.shopUI.hideSellZone(),
      this.state.gameData.player.units,
      unitId,
      soldForGold,
      chara
    );
  }

  update(time: number): void {
    // Update shop UI to handle magic orb animations using pure function
    updateShopUI(
      time,
      this.shop?.shopUI,
      (ui, currentTime) => ui.update(currentTime)
    );
  }
}

export default BattlegroundScene;
