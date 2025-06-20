import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { UIManager } from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import { CardCollection } from "../../Models/Entities/Card";
import { PlayerBoard } from "../../Models/Board";
import { Shop } from "./Systems/Shop/Shop";
import { setupTraitEventListeners } from "../../TraitSystem/TraitSystemEventListeners";
import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { BattlegroundEventSystem } from "./Systems/BattlegroundEventSystem";
import { RunCombatSystem } from "./RunCombatIO";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { GameEvents } from "../../constants/events";
import { getOption } from "../../Models/OptionsStore";
import { Unit } from "../../Models/Entities/Unit";
import { RelicCard } from "./Systems/Relic"; // Added for type checking
import { Vec2 } from "../../Models/Geometry";
import { battleResultAnimation } from "./battleResultAnimation";
import { vignette } from "./Animations/vignette";

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
    if (this.shop && this.shop.shopUI) {
      this.shop.shopUI.destroy();
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
    this.collection = this.cache.json.get("base-collection") as CardCollection;

    // Ensure cleanup logic fires for both shutdown and destroy lifecycle events
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);

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

    // 2. Load dynamic assets (card/relic images defined on the collection)
    await this.setupSystem.loadDynamicAssets(this.collection)
    console.log("Dynamic assets loaded, proceeding with scene start.");

    // 3. Initialize game state for a new game
    this.setupSystem.initializeNewGame(this.state);

    // 4. Setup static scene elements (background, player board, initial UI)
    this.playerBoard = this.setupSystem.setupSceneElements(this.state);

    // 5. Initialize and register core game event listeners
    this.eventSystem = new BattlegroundEventSystem(this);
    this.eventSystem.registerEventHandlers();

    // 6. Emit events for initial UI and board setup now that listeners are active
    this.events.emit(GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE); // For drop zone visuals
    this.events.emit(GameEvents.UI_MAIN_CREATE);               // For main UI (sidebar, gold, etc.)
    this.events.emit(GameEvents.RELIC_SLOTS_SETUP);           // For relic slots UI

    // 7. Setup Trait System event listeners
    setupTraitEventListeners(this);

    // 8. Start the game flow
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
   * Plays a sound effect.
   * @param key - The key of the sound effect to play.
   */
  playFx(key: string) {
    const volume = getOption('soundVolume');
    // Reuse Phaser's internal sound pool rather than adding a new instance every call
    this.sound.play(key, { volume });
  }

  // --- Event Handlers Moved from BattlegroundEventSystem ---

  public updatePlayerGold(goldDelta: number): void {
    const changeAmount = Math.floor(goldDelta);
    this.state.gameData.player.gold += changeAmount;
    this.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
  }

  public async handleBoardCharaCreateRequest(payload: { unit: Unit }): Promise<void> {
    // When a new Chara is requested for the board (e.g., after a purchase),
    // tell CharaManager to summon it. Default to animating its appearance.
    await CharaManager.summonChara(payload.unit, true); // summonChara is async, but we don't need to await its completion for this logic
    if (this.battleProgressionSystem.isInShopPhase) {
      // Ensure the newly summoned player unit also has its bars hidden during shop phase
      this.events.emit(GameEvents.CHARA_BARS_VISIBILITY_SET, { unitId: payload.unit.id, visible: false });
    }
  }

  public handleOwnedUnitMoveRequest(payload: { unitId: string, targetTile: Vec2, dragStartX: number, dragStartY: number }): void {
    const { unitId, targetTile, dragStartX, dragStartY } = payload;
    const unitToMove = this.state.gameData.player.units.find(u => u.id === unitId);

    if (!unitToMove) {
      console.error(`[BattlegroundScene] Unit with ID ${unitId} not found for move request.`);
      this.events.emit(GameEvents.OWNED_UNIT_MOVE_REJECTED, { unitId, reason: "UNIT_NOT_FOUND", dragStartX, dragStartY });
      return;
    }

    // Note: PlayerBoard.updateUnitPosition is static and modifies units directly.
    const moveResult = PlayerBoard.updateUnitPosition(unitToMove, targetTile, this.state.gameData.player.units);

    if (!moveResult) {
      // No change in position, or invalid move (e.g., trying to move to the same spot without a swap)
      this.events.emit(GameEvents.OWNED_UNIT_MOVE_REJECTED, { unitId, reason: "NO_CHANGE_OR_INVALID", dragStartX, dragStartY });
      return;
    }

    // Successfully moved or swapped
    // CharaManager.getCharaPosition needs the scene, which CharaManager has via init.
    const movedUnitVisualPosition = CharaManager.getCharaPosition(moveResult.movedUnit);

    if (moveResult.swappedUnit) {
      const swappedUnitVisualPosition = CharaManager.getCharaPosition(moveResult.swappedUnit);
      this.events.emit(GameEvents.OWNED_UNIT_SWAP_ACCEPTED, {
        movedUnitId: moveResult.movedUnit.id,
        movedUnitNewLogicalPosition: moveResult.movedUnit.position,
        movedUnitVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
        swappedUnitId: moveResult.swappedUnit.id,
        swappedUnitNewLogicalPosition: moveResult.swappedUnit.position,
        swappedUnitVisualPosition: { x: swappedUnitVisualPosition.x, y: swappedUnitVisualPosition.y },
      });
    } else {
      this.events.emit(GameEvents.OWNED_UNIT_MOVE_ACCEPTED, {
        unitId: moveResult.movedUnit.id,
        newLogicalPosition: moveResult.movedUnit.position,
        newVisualPosition: { x: movedUnitVisualPosition.x, y: movedUnitVisualPosition.y },
      });
    }
  }

  public handlePlayerGoldUpdateRequest(goldDelta: number): void {
    const changeAmount = Math.floor(goldDelta);
    this.state.gameData.player.gold += changeAmount;
    this.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
  }

  public handleBattleResultShow(payload: { result: "victory" | "defeat" }): void {
    battleResultAnimation(this, payload.result); // battleResultAnimation is async, but event handler is sync
  }

  public handleVignetteMessageShow(payload: { message: string }): void {
    vignette(this, payload.message);
  }

  public handleOwnedUnitSold(payload: { unitId: string, soldForGold: number }): void {
    const { unitId, soldForGold } = payload;

    // 1. Update player gold
    this.updatePlayerGold(soldForGold); // Or emit PLAYER_GOLD_DELTA_REQUEST if preferred

    // Attempt to get Chara instance for position before it's potentially destroyed
    let popTextX = this.sys.game.config.width as number / 2; // Fallback X
    let popTextY = this.sys.game.config.height as number / 2; // Fallback Y
    try {
      const charaVisual = CharaManager.getChara(unitId); // CharaManager is imported
      if (charaVisual) {
        popTextX = charaVisual.x;
        popTextY = charaVisual.y;
      }
    } catch (e) {
      console.warn(`[BattlegroundScene] Chara with ID ${unitId} not found for PopText positioning during sell. Using fallback. Error: ${e}`);
    }

    // 2. Emit PopText for gold gain
    this.events.emit(GameEvents.POP_TEXT_SHOW, {
      text: `+${soldForGold}G`,
      x: popTextX,
      y: popTextY,
      type: "success" // Using "success" (green) like relics, or "heal"
    });

    // 3. Remove unit from player's state
    const unitIndex = this.state.gameData.player.units.findIndex(u => u.id === payload.unitId);
    if (unitIndex > -1) {
      this.state.gameData.player.units.splice(unitIndex, 1);
    } else {
      console.warn(`[BattlegroundScene] Unit with ID ${payload.unitId} not found for selling.`);
    }
  }

  public handleOwnedRelicSold(payload: { relicId: string, soldForGold: number }): void {
    const { relicId, soldForGold } = payload;

    // 1. Update player gold
    this.updatePlayerGold(soldForGold); // Or emit PLAYER_GOLD_DELTA_REQUEST if preferred

    // 2. Remove relic from player's state
    const relicIndex = this.state.gameData.player.relics.findIndex(r => r.id === relicId);
    if (relicIndex > -1) {
      this.state.gameData.player.relics.splice(relicIndex, 1);
    } else {
      console.warn(`[BattlegroundScene] Relic with ID ${relicId} not found in player state during selling.`);
      // Potentially return early if relic not in state, though gold might have been added.
      // For robustness, continue to attempt visual cleanup.
    }

    // 3. Handle visual cleanup if the event was not from RelicCard self-destructing
    //    (e.g., if triggered by DebugController)
    const relicCardVisual = this.children.getByName(relicId) as RelicCard | undefined;
    if (relicCardVisual && relicCardVisual.active) { // Check if it's still an active GameObject
      // If the RelicCard is still here, it means it didn't trigger its own sell sequence.
      // So, we should emit pop text and destroy it.
      this.events.emit(GameEvents.POP_TEXT_SHOW, {
        text: `+${soldForGold}G`,
        x: relicCardVisual.x,
        y: relicCardVisual.y - (relicCardVisual.displayHeight / 2),
        type: "success"
      });
      relicCardVisual.destroy();
    }

    this.shop?.shopUI?.hideSellZone();
  }
}

export default BattlegroundScene;
