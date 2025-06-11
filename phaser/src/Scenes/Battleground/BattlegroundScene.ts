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
import { CardCollection, getAllCards, registerCollection } from "../../Models/Card";
import { battleResultAnimation } from "./battleResultAnimation";
import { delay } from "../../Utils/animation";
import { images } from "../../assets";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { popText } from "../../Systems/Chara/Animations/popText";
import * as Relic from "./Systems/Relic";
import { RunCombatSystem, WaveOutcome } from "./RunCombatIO"; // Modified import
import { Unit } from "../../Models/Unit";
import { PlayerBoard } from "../../Models/Board";
import { Shop } from "./Systems/Shop";
import { UIButton } from "./Systems/UIButton";
import * as TraitEffectsImpl from "../../Systems/TraitEffects/Implementations";
import { setupTraitEventListeners } from "../../Models/TraitSystemEventListeners";
import { GameEvents } from "../../constants/events";
import { vignette } from "./Animations/vignette";

// Constants for BattlegroundScene specific game rules
const INITIAL_PLAYER_GOLD = 20;
const VICTORY_GOLD_REWARD = 5;
const XP_PER_ENEMY = 15;
const XP_FOR_LEVEL_UP = 100;
const HP_MULTIPLIER_LEVEL_UP = 1.1;
const ATTACK_POWER_MULTIPLIER_LEVEL_UP = 0.1; // Represents a 10% increase factor (e.g., newAttack = oldAttack * (1 + 0.1))
const DEFAULT_SCENE_SOUND_VOLUME = 0.05;
const LEVEL_UP_APPRECIATION_DELAY = 1000; // ms
const POST_COMBAT_DELAY = 500; // ms

// UI Positioning (example constants, adjust as needed)
const UI_BUTTON_RESTART_X_OFFSET = 0;
const UI_BUTTON_RESTART_Y_OFFSET = 50;
const UI_BUTTON_MENU_X_OFFSET = 0;
const UI_BUTTON_MENU_Y_OFFSET = 150;

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  uiManager!: UIManager;
  playerBoard: PlayerBoard | undefined; // Can be undefined before start/after cleanup
  runCombatSystem: RunCombatSystem;
  shop: Shop;

  cleanup() {
    CharaManager.clearCharas();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    this.playerBoard?.destroy();
    this.playerBoard = undefined;

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
    state.gameData.round = 1;
    this.events.emit("requestUpdatePlayerGold", INITIAL_PLAYER_GOLD);

    this.sound.setVolume(this.state.options.soundVolume ?? DEFAULT_SCENE_SOUND_VOLUME);
  }

  private setupSceneElements(): void {
    this.bgImage = this.add.image(
      0, 0,
      images.bg_forest.key,
    ).setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
      .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

    this.bgContainer = this.add.container(0, 0);
    ControlsSystem.init(this);

    this.bgContainer.add([this.bgImage]);

    this.playerBoard = new PlayerBoard(this);
    this.events.emit("createPlayerBoardDropZone");

    this.events.emit("createMainUI");
    this.events.emit("setupRelicSlots");
  }

  private setupBattle(): { enemies: Unit[] } {
    const { state } = this;
    const cardPool = getAllCards();
    const enemies = generateEnemyTeam(state.gameData.round, cardPool);

    state.battleData.units = [...enemies, ...state.gameData.player.units];

    // Summon CPU units to the board
    enemies.forEach(unit => {
      this.events.emit("summonCharaToBoard", { unit, animateAppear: false, playSound: false });
    });
    return { enemies };
  }

  private async executeCombat(): Promise<WaveOutcome> {
    // Use the instance of RunCombatSystem
    // This method is now typically called by an event handler (_handleStartCombatExecution)
    return this.runCombatSystem.runCombatIO();
  }

  private resetPlayerUnitsForNewRound(): void {
    this.state.gameData.player.units.forEach(unit => {
      unit.charge = 0;
      unit.refresh = 0;
      unit.slowed = 0;
      unit.hasted = 0;
      unit.hp = unit.maxHp;
      unit.statuses = {};
    });
  }

  private resetPlayerUnitChargeBars(): void {
    this.state.gameData.player.units.forEach(unit => {
      this.events.emit("updateCharaChargeBar", { unitId: unit.id });
    });
  }

  private setAllPlayerUnitBarsVisibility(visible: boolean): void {
    this.state.gameData.player.units.forEach(unit => {
      this.events.emit("setCharaBarsVisibility", { unitId: unit.id, visible });
    });
  }

  private async awardXPAndHandleLevelUps(enemiesDefeatedCount: number): Promise<void> {
    const { state } = this;
    const xpGained = enemiesDefeatedCount * XP_PER_ENEMY;
    const levelUpPromises: Promise<void>[] = [];

    state.gameData.player.units.forEach(unit => {
      this.events.emit("showPopText", { text: `+${xpGained} XP`, targetId: unit.id });

      unit.xp += xpGained;
      const levelsGained = Math.floor(unit.xp / XP_FOR_LEVEL_UP);

      if (levelsGained > 0) {
        popText({
          text: `Level up!`,
          targetId: unit.id,
        });
        for (let i = 0; i < levelsGained; i++) {
          unit.maxHp = Math.floor(unit.maxHp * HP_MULTIPLIER_LEVEL_UP);
          unit.hp = unit.maxHp; // Refill HP on level up
          unit.attackPower = Math.floor(unit.attackPower * (1 + ATTACK_POWER_MULTIPLIER_LEVEL_UP));
        }
      }
      CharaManager.getChara(unit.id).updateHpDisplay();
      this.events.emit("updateCharaHpDisplay", { unitId: unit.id });
    });

    state.gameData.player.units.forEach(unit => {
      // unit.xp += xpGained; // XP already added if we are here post-check
      const levelsGained = Math.floor(unit.xp / XP_FOR_LEVEL_UP);

      if (levelsGained > 0) {
        this.events.emit("showPopText", { text: `Level up!`, targetId: unit.id });
        unit.xp -= levelsGained * XP_FOR_LEVEL_UP; // Consume XP for levels gained

        for (let i = 0; i < levelsGained; i++) {
          unit.maxHp = Math.floor(unit.maxHp * HP_MULTIPLIER_LEVEL_UP);
          unit.hp = unit.maxHp; // Refill HP on level up
          unit.attackPower = Math.floor(unit.attackPower * (1 + ATTACK_POWER_MULTIPLIER_LEVEL_UP));
        }
        levelUpPromises.push(delay(this, 0)); // Add a micro-delay or animation trigger
        this.events.emit("updateCharaHpDisplay", { unitId: unit.id });
      }
    });

    if (levelUpPromises.length > 0) {
      await Promise.all(levelUpPromises);
      await delay(this, LEVEL_UP_APPRECIATION_DELAY);
    }
  }

  // --- New Event Handlers ---
  private _handleRequestUpdatePlayerGold(goldDelta: number): void {
    const changeAmount = Math.floor(goldDelta);
    this.state.gameData.player.gold += changeAmount;
    this.events.emit(GameEvents.GOLD_CHANGED, this.state.gameData.player.gold, changeAmount);
  }

  private _handleCreatePlayerBoardDropZone(): void { this.playerBoard?.createDropZone(); }
  private _handleShowPlayerBoard(): void { this.playerBoard?.display(); }
  private _handleHidePlayerBoard(): void { this.playerBoard?.hide(); }
  private _handleCreateMainUI(): void { this.uiManager?.createMainUI(); }
  private _handleSetupRelicSlots(): void { Relic.setupRelicSlots(this); }
  private _handleSummonCharaToBoard(payload: { unit: Unit, animateAppear: boolean, playSound: boolean }): void {
    CharaManager.summonChara(payload.unit, payload.animateAppear, payload.playSound);
  }
  private _handleDestroyCharaFromBoard(payload: { unitId: string }): void {
    CharaManager.destroyChara(payload.unitId);
  }
  private _handleShowPopText(payload: { text: string, targetId: string, color?: string }): void {
    popText(payload);
  }
  private _handleUpdateCharaHpDisplay(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateHpDisplay();
  }
  private _handleUpdateCharaChargeBar(payload: { unitId: string }): void {
    CharaManager.getChara(payload.unitId)?.updateChargeBar();
  }
  private _handleSetCharaBarsVisibility(payload: { unitId: string, visible: boolean }): void {
    CharaManager.getChara(payload.unitId)?.setBarsVisibility(payload.visible);
  }
  private async _handleShowBattleResult(payload: { result: "victory" | "defeat" }): Promise<void> {
    await battleResultAnimation(this, payload.result);
  }
  private _handleShowVignetteMessage(payload: { message: string }): void {
    vignette(this, payload.message);
  }

  private _setupGameEventListeners(): void {
    this.events.on("unitDiedInBattle", this.handleUnitDiedInBattle, this);
    // Listener for when the shop signals it's done
    this.events.on("shopPhaseEnded", this.startNextRound, this);
    // Listener for when combat ends with player victory, to open shop
    this.events.on("combatEndedVictory", this.openShopPhase, this);
    this.events.on("combatEndedDefeat", this.handleGameOver, this);
    this.events.on("triggerShopPhaseOpen", this.openShopPhase, this); // For starting game and after victory

    // Register new handlers
    this.events.on("requestUpdatePlayerGold", this._handleRequestUpdatePlayerGold, this);
    this.events.on("createPlayerBoardDropZone", this._handleCreatePlayerBoardDropZone, this);
    this.events.on("showPlayerBoard", this._handleShowPlayerBoard, this);
    this.events.on("hidePlayerBoard", this._handleHidePlayerBoard, this);
    this.events.on("createMainUI", this._handleCreateMainUI, this);
    this.events.on("setupRelicSlots", this._handleSetupRelicSlots, this);
    this.events.on("summonCharaToBoard", this._handleSummonCharaToBoard, this);
    this.events.on("destroyCharaFromBoard", this._handleDestroyCharaFromBoard, this);
    this.events.on("showPopText", this._handleShowPopText, this);
    this.events.on("updateCharaHpDisplay", this._handleUpdateCharaHpDisplay, this);
    this.events.on("updateCharaChargeBar", this._handleUpdateCharaChargeBar, this);
    this.events.on("setCharaBarsVisibility", this._handleSetCharaBarsVisibility, this);
    this.events.on("showBattleResult", this._handleShowBattleResult, this);
    this.events.on("showVignetteMessage", this._handleShowVignetteMessage, this);
    this.events.on("triggerOpenShopUI", this._handleOpenShopUI, this);
    this.events.on("triggerStartCombatExecution", this._handleStartCombatExecution, this);
  }

  private handleUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
    this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
    this.events.emit("destroyCharaFromBoard", { unitId: payload.unit.id });
    // Player unit removal from player.units is handled if they die and are not revived.
  }

  /**
   * This is called each time the scene starts or is rebooted
   */
  start = async () => {
    console.log("BattlegroundScene starting logic...");

    this.shop = new Shop(this);

    this.uiManager = new UIManager(this);

    this.initializeNewGame();
    this.setupSceneElements();

    this._setupGameEventListeners();
    // setupTraitEventListeners adds listeners to this.events.
    // If this.scene.restart() is used, this.events is a new emitter, so no duplicates.
    // If scene instance was reused with manual cleanup/start, this would need careful handling.
    setupTraitEventListeners(this);

    const { state } = this;
    state.gameData.round = 1;

    // Start the first round by opening the shop
    this.events.emit("triggerShopPhaseOpen", {}); // Pass empty payload or initial round info if needed
  }

  private async _handleOpenShopUI(): Promise<void> {
    if (this.shop) {
      await this.shop.open(); // Shop internally emits "shopPhaseEnded"
    } else {
      console.error("Shop not initialized when trying to open UI.");
    }
  }

  private async handleRoundVictory(enemiesDefeated: Unit[]): Promise<void> {
    console.log("Round", this.state.gameData.round, "Processing Victory...");
    await delay(this, POST_COMBAT_DELAY);
    this.events.emit("showBattleResult", { result: "victory" });
    await delay(this, 1500); // Wait for animation
    this.events.emit("requestUpdatePlayerGold", VICTORY_GOLD_REWARD);
    this.resetPlayerUnitsForNewRound();
    this.resetPlayerUnitChargeBars();
    this.setAllPlayerUnitBarsVisibility(false);
    await this.awardXPAndHandleLevelUps(enemiesDefeated.length);

    this.state.battleData.units = []; // Clear units from battle state
    this.state.gameData.round++;
  }

  private async openShopPhase(payload?: { enemiesDefeated?: Unit[] }): Promise<void> {
    // This method is called after victory or at the start of the game.
    if (payload && payload.enemiesDefeated) { // Indicates coming from a victory
      await this.handleRoundVictory(payload.enemiesDefeated);
    }
    // Log current round for shop phase
    console.log("Round", this.state.gameData.round, "Shop Phase Starting.");
    this.events.emit("showPlayerBoard");
    this.events.emit("triggerOpenShopUI");
  }
  private async startNextRound() {
    console.log("Round", this.state.gameData.round, "Combat Phase");

    const { enemies } = this.setupBattle();

    if (this.playerBoard) { // Ensure playerBoard is defined
      this.events.emit("hidePlayerBoard");
    }

    this.events.emit("triggerStartCombatExecution", { enemies });
  }

  private async _handleStartCombatExecution(payload: { enemies: Unit[] }): Promise<void> {
    const combatResult = await this.executeCombat(); // Calls this.runCombatSystem.runCombatIO()
    if (combatResult === "player_won") {
      this.events.emit("combatEndedVictory", { enemiesDefeated: payload.enemies });
    } else {
      this.events.emit("combatEndedDefeat", {});
    }
  }

  private async handleGameOver() {
    console.log("Round", this.state.gameData.round, "Processing Defeat...");
    await delay(this, POST_COMBAT_DELAY);
    // await battleResultAnimation(this, "defeat");
    this.events.emit("showBattleResult", { result: "defeat" });
    await delay(this, 1500); // Wait for animation

    this.setAllPlayerUnitBarsVisibility(false); // Hide bars for player units even on defeat

    this.state.battleData.units = []; // Clear units from battle state

    // Game over UI
    new UIButton(this, "new run",
      constants.SCREEN_WIDTH / 2 + UI_BUTTON_RESTART_X_OFFSET,
      constants.SCREEN_HEIGHT / 2 + UI_BUTTON_RESTART_Y_OFFSET, () => {
        this.scene.restart(); // Use Phaser's scene restart
      });
    new UIButton(this, "return to menu",
      constants.SCREEN_WIDTH / 2 + UI_BUTTON_MENU_X_OFFSET,
      constants.SCREEN_HEIGHT / 2 + UI_BUTTON_MENU_Y_OFFSET, () => {
        this.scene.start("MainMenuScene");
      });

    this.events.emit("showVignetteMessage", { message: "Thanks for playing!" });
  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;
