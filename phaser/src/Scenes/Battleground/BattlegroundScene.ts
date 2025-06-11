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
const POST_COMBAT_DELAY = 500;

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;
  collection: CardCollection;
  uiManager: UIManager;
  playerBoard!: PlayerBoard;
  runCombatSystem: RunCombatSystem;
  shop: Shop;

  cleanup() {
    CharaManager.clearCharas();
    this.time.removeAllEvents();
    this.children.removeAll(true);
  }

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

  preload = preload;
  create = async (_state: State) => {

    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    const collection = this.cache.json.get("base-collection") as CardCollection;

    registerCollection(collection);

    this.collection = collection;

    // Load the card images dynamically

    TraitSystem.initializeTraitsFromData(collection.traits)

    collection.cards.forEach(card => {

      console.log("loading card", card.name, card.pic);
      this.load.image(card.pic, card.pic);
    });

    collection.relics.forEach(relic => {
      console.log("loading relic", relic.name, relic.pic);
      this.load.image(relic.pic, relic.pic);
    });

    this.load.once("complete", () => {
      console.log("All cards loaded");
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

  private async handlePostCombat(combatResult: WaveOutcome, enemiesDefeated: Unit[]): Promise<boolean> {
    const { state } = this;
    let isGameOver = false;

    await delay(this, POST_COMBAT_DELAY); // Brief pause after combat ends
    console.log("Combat result", combatResult);

    if (combatResult === "player_won") {
      await battleResultAnimation(this, "victory");
      updatePlayerGoldIO(this, VICTORY_GOLD_REWARD);
      this.resetPlayerUnitsForNewRound();
      this.resetPlayerUnitChargeBars(); // Reset visual charge bars
      this.setAllPlayerUnitBarsVisibility(false); // Hide bars for player units
      await this.awardXPAndHandleLevelUps(enemiesDefeated.length);
    } else { // player_lost
      await battleResultAnimation(this, "defeat");
      this.setAllPlayerUnitBarsVisibility(false); // Hide bars for player units even on defeat
      isGameOver = true;
      new UIButton(this, "new run", 300, 300, () => {
        this.cleanup();
        this.start(); // Restart the game
      });
      new UIButton(this, "return to menu", 300, 400, () => {
        this.scene.start("MainMenuScene");
      });
    }

    state.battleData.units = []; // Clear units from battle state for the next round
    return isGameOver;
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

    this.shop = new Shop(this);

    this.uiManager = new UIManager(this);

    this.initializeNewGame();
    this.setupSceneElements();

    this._setupGameEventListeners();
    setupTraitEventListeners(this);

    const { state } = this;
    state.gameData.round = 1;

    // Start the first round by opening the shop
    this.openShopPhase();
  }

  private async openShopPhase() {
    console.log("Round", this.state.gameData.round, "Shop Phase");
    if (this.playerBoard) this.playerBoard.display();
    await this.shop.open(); // Shop now emits SHOP_PHASE_ENDED when done
  }

  private async startNextRound() {
    console.log("Round", this.state.gameData.round, "Combat Phase");

    const { enemies } = this.setupBattle();

    if (this.playerBoard) {
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
    await this.handlePostCombat("player_lost", []);
    // Game over logic (display buttons, etc.) is already in handlePostCombat
    // No further rounds or shop phases.
    // To restart, the buttons created in handlePostCombat will call `this.start()` or `this.scene.start("MainMenuScene")`

    vignette(this, "Thanks for playing!")

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;
