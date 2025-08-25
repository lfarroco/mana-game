import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "../../Models/State";
import * as UIManager from "../../UI/UIManager";
import { Chara } from "../../Systems/Chara";
import { CardCollection } from "../../Models/Entities/Card";
import { PartyBoard, getSharedPlayerBoard } from "../../Models/Board";
import { BattlegroundSetupSystem } from "./Systems/BattlegroundSetupSystem";
import { popText } from "../../Systems/Chara/Animations/popText";
import { RunCombatSystem } from "./RunCombatIO";
import { BattleProgressionSystem } from "./Systems/BattleProgressionSystem";
import { getOption } from "../../Models/OptionsStore";
import * as BattlegroundScenePure from "./BattlegroundScene.pure";
import { updatePlayerGoldIO } from "../../Models/Entities/Force";
import * as AudioManager from "../../Systems/AudioManager";
import * as Shop from "./Systems/Shop/Shop";
import * as MoraleDisplay from "./MoraleDisplay";
import * as ShopUI from "./Systems/Shop/ShopUI";

export let scene: BattlegroundScene;

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  bgContainer!: Phaser.GameObjects.Container;
  cloudsBackground!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  playerBoard!: PartyBoard;
  runCombatSystem: RunCombatSystem;
  battleProgressionSystem: BattleProgressionSystem;

  setupSystem!: BattlegroundSetupSystem;

  cleanup() {
    Chara.clearAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    this.setupSystem.destroy();

    MoraleDisplay.destroy();
    UIManager.destroy();
    ShopUI.destroy();

  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.state = getState();
    this.runCombatSystem = new RunCombatSystem();

  }

  destroy() {
    console.log("BattlegroundScene destroy.");
    this.cleanup();
  }

  preload = preload;

  create = async () => {
    scene = this;
    this.battleProgressionSystem = new BattleProgressionSystem(this, this.state);
    this.collection = this.cache.json.get("base-collection") as CardCollection;

    this.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);

    const speed = getOption("speed");

    this.time.timeScale = speed;
    this.tweens.timeScale = speed;

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

  handleOwnedUnitSold(payload: { unitId: string, soldForGold: number }): void {
    const { unitId, soldForGold } = payload;

    const chara = Chara.getCharaById(unitId);

    this.state.gameData.player.units = BattlegroundScenePure.handleOwnedUnitSold(
      (amount: number) => updatePlayerGoldIO(amount),
      ShopUI.hideSellZone,
      this.state.gameData.player.units,
      unitId,
      soldForGold,
      chara,
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
    ShopUI.update(time);
    const playerBoard = getSharedPlayerBoard();
    playerBoard?.update(time);

    this.runCombatSystem.updateFrame(time, delta);
  }
}

export default BattlegroundScene;
