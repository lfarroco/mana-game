import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as AISystem from "../../Systems/AI/AI";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import * as constants from "./constants";
import { UIManager } from "./Systems/UIManager";
import * as CharaManager from "./Systems/CharaManager";
import * as TraitSystem from "../../Models/Traits";
import { CardCollection, getAllCards, registerCollection, } from "../../Models/Card";
import { battleResultAnimation } from "./battleResultAnimation";
import { images } from "../../assets";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { popText } from "../../Systems/Chara/Animations/popText";
import * as Relic from "./Systems/Relic";
import { RunCombatSystem, WaveOutcome } from "./RunCombatIO"; // Modified import
import { Unit } from "../../Models/Unit";
import { initializeSharedPlayerBoard, PlayerBoard, createBoardDropZone as createPlayerBoardDropZone } from "../../Models/Board";
import { Shop } from "./Systems/Shop";
import { UIButton } from "./Systems/UIButton";
import * as TraitEffectsImpl from "../../Systems/TraitEffects/Implementations";
import { setupTraitEventListeners } from "../../Models/TraitSystemEventListeners";
import { GameEvents } from "../../constants/events";
import { vignette } from "./Animations/vignette";
import * as BG_CONSTANTS from "./battlegroundConstants";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  uiManager!: UIManager;
  playerBoard!: PlayerBoard; // Initialized in create/start
  runCombatSystem: RunCombatSystem;
  battleProgressionSystem: BattleProgressionSystem;
  shop: Shop;

  cleanup() {
    CharaManager.clearCharas();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    // PlayerBoard is a singleton managed by its module, destroy visuals if needed
    this.playerBoard.clearVisuals(); // Or playerBoard.destroy() if it's not a singleton instance tied to scene

    // If Shop or UIManager have their own complex cleanup (e.g., global listeners, non-Phaser resources)
    // they would need destroy methods called here.
    // For now, assuming their Phaser GameObjects are handled by scene.children.removeAll or new instances on restart.
    // if (this.shop && typeof (this.shop as any).destroy === 'function') { (this.shop as any).destroy(); }
    // if (this.uiManager && typeof (this.uiManager as any).destroy === 'function') { (this.uiManager as any).destroy(); }
  }

  // Flag to ensure runtime data like card collections and traits are registered only once.
  private static runtimeDataInitialized = false;


  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;
    this.speed = state.options.speed;
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

  shutdown() {
    console.log("BattlegroundScene shutdown.");
    this.cleanup(); // Call our custom cleanup
  }

  preload = preload;
  create = async (_state: State) => {
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

  private async executeCombat(): Promise<WaveOutcome> {
    return this.runCombatSystem.runCombatIO();
  }

  // --- New Event Handlers ---
  private _onPlayerGoldUpdateRequest(goldDelta: number): void {
    const changeAmount = Math.floor(goldDelta);
    this.state.gameData.player.gold += changeAmount;
    this.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
  }

  private _onPlayerBoardCreateDropZone(): void { createPlayerBoardDropZone(); } // Use module function for singleton
  private _onPlayerBoardShow(): void { this.playerBoard.display(); }
  private _onPlayerBoardHide(): void { this.playerBoard.hide(); }
  private _onUIMainCreate(): void { this.uiManager.createMainUI(); }
  private _onRelicSlotsSetup(): void { Relic.setupRelicSlots(this); }
  private _onCharaSummonToBoard(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
    CharaManager.summonChara(payload.unit, payload.animateAppear, payload.playSound);
  }
  private _onCharaDestroyFromBoard(payload: { unitId: string }): void {
    CharaManager.destroyChara(payload.unitId);
  }
  private _onPopTextShow(payload: { text: string, targetId: string, color?: string }): void {
    popText(payload);
  }
  private _onCharaHpDisplayUpdate(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateHpDisplay();
  }
  private _onCharaChargeBarUpdate(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateChargeBar();
  }
  private _onCharaBarsVisibilitySet(payload: { unitId: string, visible: boolean }): void {
    CharaManager.getChara(payload.unitId)?.setBarsVisibility(payload.visible);
  }
  private async _onBattleResultShow(payload: { result: "victory" | "defeat" }): Promise<void> {
    await battleResultAnimation(this, payload.result);
  }
  private _onVignetteMessageShow(payload: { message: string }): void {
    vignette(this, payload.message);
  }

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

  private _onUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
    this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
    this.events.emit(GameEvents.CHARA_DESTROY_FROM_BOARD, { unitId: payload.unit.id });
    // Player unit removal from player.units is handled if they die and are not revived.
  }

  /**
   * This is called each time the scene starts or is rebooted
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

  private async _onShopOpenUITrigger(): Promise<void> {
    if (this.shop) {
      await this.shop.open(); // Shop internally emits "shopPhaseEnded"
    } else {
      console.error("Shop not initialized when trying to open UI.");
    }
  }

  // Event handler for when the shop phase ends
  private _onShopPhaseEnded(): void {
    this.battleProgressionSystem.transitionToCombatPhase();
  }

  // Event handler for when combat ends with player victory
  private _onCombatEndedVictory(payload: { enemiesDefeated: Unit[] }): void {
    this.battleProgressionSystem.transitionToShopPhase(payload);
  }

  // Event handler for when combat ends with player defeat
  private _onCombatEndedDefeat(): void {
    this.battleProgressionSystem.processGameOver();
  }

  // Event handler to actually start the combat execution
  private async _onCombatStartExecutionTrigger(payload: { enemies: Unit[] }): Promise<void> {
    const combatResult = await this.executeCombat(); // Calls this.runCombatSystem.runCombatIO()
    if (combatResult === "player_won") {
      this.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: payload.enemies });
    } else {
      this.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
    }
  }

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

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;
