import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import * as AISystem from "../../Systems/AI/AI";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { UIManager } from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import { CardCollection } from "../../Models/Entities/Card";
import { RunCombatSystem } from "./RunCombatIO";
import { PlayerBoard } from "../../Models/Board";
import { Shop } from "./Systems/Shop";
import * as TraitEffectsImpl from "../../TraitSystem/TraitEffects/Implementations";
import { setupTraitEventListeners } from "../../TraitSystem/TraitSystemEventListeners";

import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { BattlegroundEventSystem } from "./Systems/BattlegroundEventSystem";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";

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
  bgImage!: Phaser.GameObjects.Image;
  /** The current card collection being used. */
  collection!: CardCollection;
  /** Manages UI elements within the scene. */
  uiManager!: UIManager;
  /** Represents the player's board and handles unit placement. */
  playerBoard!: PlayerBoard; // Initialized in create/start
  /** System responsible for running the combat simulation. */
  runCombatSystem: RunCombatSystem;
  /** System responsible for managing battle progression (shop, combat, game over). */
  battleProgressionSystem: BattleProgressionSystem;
  /** The shop system, allowing players to buy units and relics. */
  shop: Shop;

  // New Systems
  private setupSystem!: BattlegroundSetupSystem;
  private eventSystem!: BattlegroundEventSystem;


  /** Cleans up resources and event listeners. */
  cleanup() {
    CharaManager.clearCharas();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    if (this.playerBoard) {
      this.playerBoard.clearVisuals();
    }

    if (this.uiManager) {
      this.uiManager.destroy();
    }
    if (this.eventSystem) {
      this.eventSystem.destroy();
    }
    // Note: Shop, RunCombatSystem, BattleProgressionSystem, SetupSystem might need destroy methods
    // if they acquire resources or set up listeners not tied to scene.events.
  }

  /** Constructs the BattlegroundScene. */
  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.state = getState();
    // Initialize systems that are core to the scene's operation or have early dependencies
    this.runCombatSystem = new RunCombatSystem(this);
    this.battleProgressionSystem = new BattleProgressionSystem(this, this.state);
    // this.shop, this.uiManager, this.setupSystem, this.eventSystem will be initialized in start()

    // Global, one-time initializations
    AISystem.init(this.state);
    BattlegroundAudioSystem_init(this.state, this);
    CharaManager.init(this);
    TraitEffectsImpl.registerAllTraitEffects(); // This is truly global and idempotent

    if (process.env.NODE_ENV === 'development') {
      //@ts-ignore
      window.bg = this;
    }

  }

  /** Phaser scene lifecycle method called when the scene is shut down. */
  shutdown() {
    console.log("BattlegroundScene shutdown.");
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
    this.collection = this.cache.json.get("base-collection") as CardCollection;

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

    // 2. Load dynamic assets (card/relic images based on the collection)
    await new Promise<void>(resolve => {
      this.setupSystem.loadDynamicAssets(this.collection, resolve);
    });
    console.log("Dynamic assets loaded, proceeding with scene start.");

    // 3. Initialize game state for a new game
    this.setupSystem.initializeNewGame(this.state);

    // 4. Setup static scene elements (background, player board, initial UI)
    this.playerBoard = this.setupSystem.setupSceneElements(this.state);

    // 5. Initialize and register game event listeners
    this.eventSystem = new BattlegroundEventSystem(
      this,
      this.state,
      this.uiManager,
      this.playerBoard,
      this.shop,
      this.battleProgressionSystem,
      this.runCombatSystem
    );
    this.eventSystem.registerEventHandlers();

    // 6. Setup Trait System event listeners
    setupTraitEventListeners(this);

    // 7. Start the game flow
    this.battleProgressionSystem.transitionToShopPhase(); // Initial call, no enemies defeated
  }

  /**
   * Plays a sound effect.
   * @param key - The key of the sound effect to play.
   */
  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;
