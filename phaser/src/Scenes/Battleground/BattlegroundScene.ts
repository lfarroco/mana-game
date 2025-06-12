import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as AISystem from "../../Systems/AI/AI";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import * as constants from "../../constants/constants";
import { UIManager } from "../../UI/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import * as TraitSystem from "../../TraitSystem/Traits";
import { CardCollection, getAllCards, registerCollection, } from "../../Models/Entities/Card";
import { battleResultAnimation } from "./battleResultAnimation";
import { images } from "../../assets";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { popText } from "../../Systems/Chara/Animations/popText";
import * as Relic from "./Systems/Relic";
import { RunCombatSystem, WaveOutcome } from "./RunCombatIO";
import { Unit } from "../../Models/Entities/Unit";
import { initializeSharedPlayerBoard, PlayerBoard, createBoardDropZone as createPlayerBoardDropZone } from "../../Models/Board";
import { Shop } from "./Systems/Shop";
import * as TraitEffectsImpl from "../../TraitSystem/TraitEffects/Implementations";
import { setupTraitEventListeners } from "../../TraitSystem/TraitSystemEventListeners";
import { GameEvents } from "../../constants/events";
import { vignette } from "./Animations/vignette";
import * as BG_CONSTANTS from "./battlegroundConstants";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { UIButton } from "../../UI/UIButton";

/**
 * The main scene for the battleground, handling game logic, UI, and progression.
 * It orchestrates the shop phase, combat phase, and interactions between various game systems.
 */
export class BattlegroundScene extends Phaser.Scene {
  /** The global game state. */
  state: State;
  /** Container for background elements. */
  bgContainer!: Phaser.GameObjects.Container;
  /** The background image of the scene. */
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

  /**
   * Cleans up resources and event listeners when the scene is shut down or restarted.
   * This includes clearing characters, timers, display objects, and UI elements.
   */
  cleanup() {
    CharaManager.clearCharas();
    this.time.removeAllEvents();
    // According to Phaser 3 documentation, `this.children.removeAll(true)`
    // is a more direct way to remove all GameObjects from the scene's display list
    // and optionally destroy them.
    // It's generally preferred over iterating and destroying manually unless specific
    // order or conditions are needed.
    // The `true` argument ensures that the children are also destroyed.
    this.children.removeAll(true);

    // PlayerBoard is a singleton managed by its module, destroy visuals if needed
    this.playerBoard.clearVisuals(); // Or playerBoard.destroy() if it's not a singleton instance tied to scene

    if (this.uiManager) {
      this.uiManager.destroy();
    }
    // If Shop had a destroy method for similar reasons, it would be called here:
    // if (this.shop && typeof this.shop.destroy === 'function') { this.shop.destroy(); }
  }

  /**
   * Flag to ensure runtime data like card collections and traits are registered only once
   * across all instances or restarts of the scene if the data is truly global and
   * should not be re-registered.
   * @private
   */
  private static runtimeDataInitialized = false;

  /**
   * Constructs the BattlegroundScene.
   * Initializes core systems and sets up global listeners that persist across scene restarts.
   */
  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;
    this.runCombatSystem = new RunCombatSystem(this);
    this.battleProgressionSystem = new BattleProgressionSystem(this, this.state);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    AISystem.init(state);
    BattlegroundAudioSystem_init(state, this); // Assuming this doesn't need state passed if it's self-contained
    CharaManager.init(this); // CharaManager needs the scene reference

    // Initialize Trait Definitions and Effect Implementations (once)
    TraitEffectsImpl.registerAllTraitEffects();
    // UIManager will be initialized in the start() method

    if (process.env.NODE_ENV === 'development') {
      //@ts-ignore
      window.bg = this;
    }

  }

  /**
   * Phaser scene lifecycle method called when the scene is shut down.
   * Calls the custom cleanup method.
   */
  shutdown() {
    console.log("BattlegroundScene shutdown.");
    this.cleanup(); // Call our custom cleanup
  }

  /** Phaser scene lifecycle method for preloading assets. */
  preload = preload;

  /**
   * Phaser scene lifecycle method called once when the scene is created.
   * Responsible for setting up initial data that doesn't change on scene restart,
   * like loading JSON data and registering collections if not already done.
   * It then loads dynamic assets and calls `start()` upon completion.
   */
  create = async () => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    this.collection = this.cache.json.get("base-collection") as CardCollection;

    if (!BattlegroundScene.runtimeDataInitialized) {
      if (process.env.NODE_ENV === 'development') {
        console.log("Performing one-time runtime data initialization.");
      }
      registerCollection(this.collection);
      TraitSystem.initializeTraitsFromData(this.collection.traits);
      BattlegroundScene.runtimeDataInitialized = true;
    }

    // Load card and relic images dynamically every time create is called (Phaser handles caching)
    const loadAsset = (asset: { name: string, pic: string }, type: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loading ${type} asset: ${asset.name} - ${asset.pic}`);
      }
      this.load.image(asset.pic, asset.pic); // Use asset.pic as key and path
    };

    this.collection.cards.forEach(card => loadAsset(card, "card"));
    this.collection.relics.forEach(relic => loadAsset(relic, "relic"));

    this.load.once("complete", () => {
      console.log("Asset loading complete for BattlegroundScene.");
      this.start();
    });

    this.load.start();

  }

  /**
   * Initializes or resets the game state for a new game or round.
   * Sets player gold, clears units and relics, and resets the round counter.
   */
  private initializeNewGame(): void {

    if (process.env.NODE_ENV === 'development') {
      //@ts-ignore
      window.scene = this;
    }

    const { state } = this;
    state.gameData.player.gold = 0;
    state.gameData.player.units = [];
    state.gameData.player.relics = [];
    state.gameData.round = 1; // Progression system will manage round increments
    this.events.emit(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, BG_CONSTANTS.INITIAL_PLAYER_GOLD);

    this.sound.setVolume(this.state.options.soundVolume ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
  }

  /**
   * Sets up static scene elements like the background, player board,
   * and initial UI components.
   */
  private setupSceneElements(): void {
    this.bgImage = this.add.image(
      0, 0,
      images.bg_forest.key,
    ).setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
      .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

    this.bgContainer = this.add.container(0, 0);
    ControlsSystem.init(this);

    this.bgContainer.add([this.bgImage]); // Add other static elements to bgContainer if needed

    this.playerBoard = initializeSharedPlayerBoard(this);
    this.events.emit(GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE);

    this.events.emit(GameEvents.UI_MAIN_CREATE);
    this.events.emit(GameEvents.RELIC_SLOTS_SETUP);
  }

  /**
   * Sets up the battle by generating the enemy team and adding all units (player and enemy)
   * to the battle data. Also summons CPU units to the board.
   * @returns An object containing the array of enemy units.
   */
  public setupBattle(): { enemies: Unit[] } {
    const { state } = this;
    const cardPool = getAllCards();
    const enemies = generateEnemyTeam(state.gameData.round, cardPool);

    state.battleData.units = [...enemies, ...state.gameData.player.units];

    // Summon CPU units to the board
    enemies.forEach(unit => {
      this.events.emit(GameEvents.CHARA_SUMMON_TO_BOARD, { unit, animateAppear: false, playSound: false });
    });
    return { enemies };
  }

  /**
   * Executes the combat simulation for the current wave.
   * @returns A promise that resolves with the outcome of the wave ("player_won" or "player_lost").
   * @async
   */
  private async executeCombat(): Promise<WaveOutcome> {
    return this.runCombatSystem.runCombatIO();
  }

  // --- New Event Handlers ---
  /**
   * Handles requests to update the player's gold.
   * @param goldDelta The amount to change the gold by (can be positive or negative).
   * @private
   */
  private _onPlayerGoldUpdateRequest(goldDelta: number): void {
    const changeAmount = Math.floor(goldDelta);
    this.state.gameData.player.gold += changeAmount;
    this.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
  }

  /** Handles the creation of the player board drop zone. @private */
  private _onPlayerBoardCreateDropZone(): void { createPlayerBoardDropZone(); } // Use module function for singleton
  /** Handles showing the player board. @private */
  private _onPlayerBoardShow(): void { this.playerBoard.display(); }
  /** Handles hiding the player board. @private */
  private _onPlayerBoardHide(): void { this.playerBoard.hide(); }
  /** Handles the creation of the main UI. @private */
  private _onUIMainCreate(): void { this.uiManager.createMainUI(); }
  /** Handles the setup of relic slots. @private */
  private _onRelicSlotsSetup(): void { Relic.setupRelicSlots(this); }
  /**
   * Handles summoning a character to the board.
   * @param payload - The event payload.
   * @param payload.unit - The unit to summon.
   * @param payload.animateAppear - Whether to animate the appearance.
   * @param payload.playSound - Whether to play a sound on summon.
   * @private
   */
  private _onCharaSummonToBoard(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
    CharaManager.summonChara(payload.unit, payload.animateAppear, payload.playSound);
  }
  /**
   * Handles destroying a character from the board.
   * @param payload - The event payload.
   * @param payload.unitId - The ID of the unit whose character to destroy.
   * @private
   */
  private _onCharaDestroyFromBoard(payload: { unitId: string }): void {
    CharaManager.destroyChara(payload.unitId);
  }
  /**
   * Handles showing pop-up text.
   * @param payload - The event payload.
   * @param payload.text - The text to display.
   * @param payload.targetId - The ID of the target game object for positioning.
   * @param payload.color - Optional color for the text.
   * @private
   */
  private _onPopTextShow(payload: { text: string, targetId: string, color?: string }): void {
    popText(payload);
  }
  /**
   * Handles updating a character's HP display.
   * @param payload - The event payload.
   * @param payload.unitId - The ID of the unit whose HP display to update.
   * @private
   */
  private _onCharaHpDisplayUpdate(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateHpDisplay();
  }
  /**
   * Handles updating a character's charge bar.
   * @param payload - The event payload.
   * @param payload.unitId - The ID of the unit whose charge bar to update.
   * @private
   */
  private _onCharaChargeBarUpdate(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateChargeBar();
  }
  /**
   * Handles setting the visibility of a character's bars (HP, charge).
   * @param payload - The event payload.
   * @param payload.unitId - The ID of the unit whose bars' visibility to set.
   * @param payload.visible - True to show bars, false to hide.
   * @private
   */
  private _onCharaBarsVisibilitySet(payload: { unitId: string, visible: boolean }): void {
    CharaManager.getChara(payload.unitId)?.setBarsVisibility(payload.visible);
  }
  /**
   * Handles showing the battle result animation (victory/defeat).
   * @param payload - The event payload.
   * @param payload.result - The result of the battle.
   * @private
   * @async
   */
  private async _onBattleResultShow(payload: { result: "victory" | "defeat" }): Promise<void> {
    await battleResultAnimation(this, payload.result);
  }
  /**
   * Handles showing a vignette message.
   * @param payload - The event payload.
   * @param payload.message - The message to display in the vignette.
   * @private
   */
  private _onVignetteMessageShow(payload: { message: string }): void {
    vignette(this, payload.message);
  }

  /**
   * Sets up all game-specific event listeners for the scene.
   * These listeners handle various game events and trigger corresponding actions.
   * @private
   */
  private _setupGameEventListeners(): void {
    this.events.on(GameEvents.UNIT_DIED_IN_BATTLE, this._onUnitDiedInBattle, this);
    this.events.on(GameEvents.SHOP_PHASE_ENDED, this._onShopPhaseEnded, this);
    this.events.on(GameEvents.COMBAT_ENDED_VICTORY, this._onCombatEndedVictory, this);
    this.events.on(GameEvents.COMBAT_ENDED_DEFEAT, this._onCombatEndedDefeat, this);
    this.events.on(GameEvents.GAME_OVER_SHOW_UI_TRIGGER, this._onGameOverShowUITrigger, this);

    // Register new handlers
    this.events.on(GameEvents.PLAYER_GOLD_UPDATE_REQUEST, this._onPlayerGoldUpdateRequest, this);
    this.events.on(GameEvents.PLAYER_BOARD_CREATE_DROP_ZONE, this._onPlayerBoardCreateDropZone, this);
    this.events.on(GameEvents.PLAYER_BOARD_SHOW, this._onPlayerBoardShow, this);
    this.events.on(GameEvents.PLAYER_BOARD_HIDE, this._onPlayerBoardHide, this);
    this.events.on(GameEvents.UI_MAIN_CREATE, this._onUIMainCreate, this);
    this.events.on(GameEvents.RELIC_SLOTS_SETUP, this._onRelicSlotsSetup, this);
    this.events.on(GameEvents.CHARA_SUMMON_TO_BOARD, this._onCharaSummonToBoard, this);
    this.events.on(GameEvents.CHARA_DESTROY_FROM_BOARD, this._onCharaDestroyFromBoard, this);
    this.events.on(GameEvents.POP_TEXT_SHOW, this._onPopTextShow, this);
    this.events.on(GameEvents.CHARA_HP_DISPLAY_UPDATE, this._onCharaHpDisplayUpdate, this);
    this.events.on(GameEvents.CHARA_CHARGE_BAR_UPDATE, this._onCharaChargeBarUpdate, this);
    this.events.on(GameEvents.CHARA_BARS_VISIBILITY_SET, this._onCharaBarsVisibilitySet, this);
    this.events.on(GameEvents.BATTLE_RESULT_SHOW, this._onBattleResultShow, this);
    this.events.on(GameEvents.VIGNETTE_MESSAGE_SHOW, this._onVignetteMessageShow, this);
    this.events.on(GameEvents.SHOP_OPEN_UI_TRIGGER, this._onShopOpenUITrigger, this);
    this.events.on(GameEvents.COMBAT_START_EXECUTION_TRIGGER, this._onCombatStartExecutionTrigger, this);
  }

  /**
   * Handles the event when a unit dies in battle.
   * Removes the unit from the battle data and destroys its character representation.
   * @param payload - The event payload.
   * @param payload.unit - The unit that died.
   * @param payload.killerId - Optional ID of the unit that killed this unit.
   * @private
   */
  private _onUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
    this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
    this.events.emit(GameEvents.CHARA_DESTROY_FROM_BOARD, { unitId: payload.unit.id });
    // Player unit removal from player.units is handled if they die and are not revived.
  }

  /**
   * Main starting point for the scene's logic after assets are loaded (called by `create`).
   * This method is called each time the scene starts or is restarted.
   * It initializes UI, game state for a new game, sets up scene elements and event listeners,
   * and transitions to the first shop phase.
   */
  start = async () => {
    console.log("BattlegroundScene starting logic...");

    this.shop = new Shop(this); // Shop might be needed by UIManager or ProgressionSystem indirectly
    this.uiManager = new UIManager(this); // UIManager sets up UI listeners

    this.initializeNewGame();
    this.setupSceneElements();

    this._setupGameEventListeners();
    // setupTraitEventListeners adds listeners to this.events.
    // If this.scene.restart() is used, this.events is a new emitter, so no duplicates.
    // If scene instance was reused with manual cleanup/start, this would need careful handling.
    setupTraitEventListeners(this);

    // Start the first round by opening the shop
    this.battleProgressionSystem.transitionToShopPhase(); // Initial call, no enemies defeated
  }

  /**
   * Handles the trigger to open the shop UI.
   * @private
   * @async
   */
  private async _onShopOpenUITrigger(): Promise<void> {
    if (this.shop) {
      await this.shop.open(); // Shop internally emits "shopPhaseEnded"
    } else {
      console.error("Shop not initialized when trying to open UI.");
    }
  }

  /**
   * Event handler for when the shop phase ends.
   * Transitions the game to the combat phase.
   * @private
   */
  private _onShopPhaseEnded(): void {
    this.battleProgressionSystem.transitionToCombatPhase();
  }

  /**
   * Event handler for when combat ends with player victory.
   * @param payload - The event payload.
   * @param payload.enemiesDefeated - An array of enemy units defeated in combat.
   * @private
   */
  private _onCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): void {
    this.battleProgressionSystem.transitionToShopPhase(payload);
  }

  /**
   * Event handler for when combat ends with player defeat.
   * Processes the game over sequence.
   * @private
   */
  private _onCombatEndedDefeat(): void {
    this.battleProgressionSystem.processGameOver();
  }

  /**
   * Event handler to start the combat execution.
   * This is triggered after the combat phase setup is complete.
   * It runs the combat simulation and then emits events based on the outcome.
   * @param payload - The event payload.
   * @param payload.enemies - An array of enemy units participating in the combat.
   * @private
   * @async
   */
  private async _onCombatStartExecutionTrigger(payload: { enemies: Unit[] }): Promise<void> {
    const combatResult = await this.executeCombat(); // Calls this.runCombatSystem.runCombatIO()
    if (combatResult === "player_won") {
      this.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: payload.enemies });
    } else {
      this.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
    }
  }

  /**
   * Handles showing the game over UI, including "New Run" and "Return to Menu" buttons.
   * @private
   */
  private _onGameOverShowUITrigger(): void {
    // Game over UI
    new UIButton(this, "new run",
      constants.SCREEN_WIDTH / 2 + BG_CONSTANTS.UI_BUTTON_RESTART_X_OFFSET,
      constants.SCREEN_HEIGHT / 2 + BG_CONSTANTS.UI_BUTTON_RESTART_Y_OFFSET, () => {
        this.scene.restart(); // Use Phaser's scene restart
      });
    new UIButton(this, "return to menu",
      constants.SCREEN_WIDTH / 2 + BG_CONSTANTS.UI_BUTTON_MENU_X_OFFSET,
      constants.SCREEN_HEIGHT / 2 + BG_CONSTANTS.UI_BUTTON_MENU_Y_OFFSET, () => {
        this.scene.start("MainMenuScene");
      });
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
