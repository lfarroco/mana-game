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
import { vignette } from "./Animations/vignette";
import { updatePlayerGoldIO } from "../../Models/Force";
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
      console.log("Performing one-time runtime data initialization.");
      registerCollection(this.collection);
      TraitSystem.initializeTraitsFromData(this.collection.traits);
      BattlegroundScene.runtimeDataInitialized = true;
    }

    // Load card and relic images dynamically every time create is called (Phaser handles caching)
    this.collection.cards.forEach(card => {

      console.log("loading card", card.name, card.pic);
      this.load.image(card.pic, card.pic);
    });

    this.collection.relics.forEach(relic => {
      console.log("loading relic", relic.name, relic.pic);
      this.load.image(relic.pic, relic.pic);
    });

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
    updatePlayerGoldIO(this, INITIAL_PLAYER_GOLD);

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
    this.playerBoard.createDropZone();

    this.uiManager.createMainUI();
    Relic.setupRelicSlots(this);
  }

  private setupBattle(): { enemies: Unit[] } {
    const { state } = this;
    const cardPool = getAllCards();
    const enemies = generateEnemyTeam(state.gameData.round, cardPool);

    state.battleData.units = [...enemies, ...state.gameData.player.units];

    // Summon CPU units to the board
    enemies.forEach(unit => {
      CharaManager.summonChara(unit, false, false); // Assuming CPU units don't need summon/fade effects here
    });
    return { enemies };
  }

  private async executeCombat(): Promise<WaveOutcome> {
    // Use the instance of RunCombatSystem
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
      const chara = CharaManager.getChara(unit.id);
      if (chara) {
        chara.updateChargeBar();
      }
    });
  }

  private setAllPlayerUnitBarsVisibility(visible: boolean): void {
    this.state.gameData.player.units.forEach(unit => {
      const chara = CharaManager.getChara(unit.id);
      if (chara) {
        chara.setBarsVisibility(visible);
      }
    });
  }

  private async awardXPAndHandleLevelUps(enemiesDefeatedCount: number): Promise<void> {
    const { state } = this;
    const xpGained = enemiesDefeatedCount * XP_PER_ENEMY;
    let anyUnitLeveledUp = false;

    state.gameData.player.units.forEach(unit => {
      popText({
        text: `+${xpGained} XP`,
        targetId: unit.id,
      });
      unit.xp += xpGained;
      const levelsGained = Math.floor(unit.xp / XP_FOR_LEVEL_UP);

      if (levelsGained > 0) {
        anyUnitLeveledUp = true;
        popText({
          text: `Level up!`,
          targetId: unit.id,
        });
        unit.xp -= levelsGained * XP_FOR_LEVEL_UP;

        for (let i = 0; i < levelsGained; i++) {
          unit.maxHp = Math.floor(unit.maxHp * HP_MULTIPLIER_LEVEL_UP);
          unit.hp = unit.maxHp; // Refill HP on level up
          unit.attackPower = Math.floor(unit.attackPower * (1 + ATTACK_POWER_MULTIPLIER_LEVEL_UP));
        }
      }
      CharaManager.getChara(unit.id).updateHpDisplay();
    });

    if (anyUnitLeveledUp) {
      await delay(this, LEVEL_UP_APPRECIATION_DELAY); // Delay to appreciate level up
    }
  }

  private _setupGameEventListeners(): void {
    this.events.on(GameEvents.UNIT_DIED_IN_BATTLE, this.handleUnitDiedInBattle, this);
    // Listener for when the shop signals it's done
    this.events.on(GameEvents.SHOP_PHASE_ENDED, this.startNextRound, this);
    // Listener for when combat ends with player victory, to open shop
    this.events.on(GameEvents.COMBAT_ENDED_VICTORY, this.openShopPhase, this);
    this.events.on(GameEvents.COMBAT_ENDED_DEFEAT, this.handleGameOver, this);
  }

  private handleUnitDiedInBattle(payload: { unit: Unit, killerId?: string }): void {
    this.state.battleData.units = this.state.battleData.units.filter(u => u.id !== payload.unit.id);
    CharaManager.destroyChara(payload.unit.id); // Visual cleanup
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
    this.openShopPhase();
  }

  private async openShopPhase(payload?: { enemiesDefeated: Unit[] }) {
    // This method is called after victory or at the start of the game.
    if (payload && payload.enemiesDefeated) { // Indicates coming from a victory
      console.log("Round", this.state.gameData.round, "Processing Victory...");
      await delay(this, POST_COMBAT_DELAY);
      await battleResultAnimation(this, "victory");
      updatePlayerGoldIO(this, VICTORY_GOLD_REWARD);
      this.resetPlayerUnitsForNewRound();
      this.resetPlayerUnitChargeBars();
      this.setAllPlayerUnitBarsVisibility(false);
      await this.awardXPAndHandleLevelUps(payload.enemiesDefeated.length);

      this.state.battleData.units = []; // Clear units from battle state
      this.state.gameData.round++; // Increment round after victory
    }

    console.log("Round", this.state.gameData.round, "Shop Phase Starting");
    if (this.playerBoard) this.playerBoard.display();
    await this.shop.open(); // Shop emits SHOP_PHASE_ENDED when done
  }

  private async startNextRound() {
    console.log("Round", this.state.gameData.round, "Combat Phase");

    const { enemies } = this.setupBattle();

    if (this.playerBoard) { // Ensure playerBoard is defined
      this.playerBoard.hide();
    }

    const combatResult = await this.executeCombat();
    // Combat system will now emit COMBAT_ENDED_VICTORY or COMBAT_ENDED_DEFEAT
    // The listeners for these events will handle the next steps.
    // We pass the enemies defeated for XP calculation if it's a victory.
    if (combatResult === "player_won") {
      this.events.emit(GameEvents.COMBAT_ENDED_VICTORY, { enemiesDefeated: enemies });
    } else {
      this.events.emit(GameEvents.COMBAT_ENDED_DEFEAT, {});
    }
  }

  private async handleGameOver() {
    console.log("Round", this.state.gameData.round, "Processing Defeat...");
    await delay(this, POST_COMBAT_DELAY);
    await battleResultAnimation(this, "defeat");
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

    vignette(this, "Thanks for playing!")
  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;
