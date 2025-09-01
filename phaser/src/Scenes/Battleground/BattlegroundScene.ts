import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "@Models/State";
import * as UIManager from "../../UI/UI";
import { CardCollection } from "@Models/Entities/Card";
import * as Board from "@Models/Board";
import { RunCombatSystem } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Shop from "./Systems/Shop";
import * as MoraleDisplay from "./MoraleDisplay";
import * as Systems from "./Systems"
import { clearAll } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";

export let scene: BattlegroundScene;

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  bgContainer!: Phaser.GameObjects.Container;
  cloudsBackground!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  runCombatSystem: RunCombatSystem;
  timerText!: Phaser.GameObjects.Text;
  timerCircle!: Phaser.GameObjects.Arc;
  timerValue: number = 10;
  timerEvent?: Phaser.Time.TimerEvent;

  cleanup() {
    clearAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    Systems.Setup.destroy();

    MoraleDisplay.destroy();
    UIManager.destroy();
    Shop.UI.destroy();
    ResultsUI.destroy();

  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.state = getState();
    this.runCombatSystem = new RunCombatSystem();

  }

  preload = preload;

  create = async () => {
    scene = this;

    this.collection = this.cache.json.get("base-collection") as CardCollection;

    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    const speed = getOption("speed");

    this.time.timeScale = speed;
    this.tweens.timeScale = speed;

    this.start();

  }

  start = async () => {
    console.log("BattlegroundScene starting logic...");

    Systems.Loader.init(this.collection);
    Systems.Loader.loadDynamicAssets(this.collection)

    Systems.Setup.initializeNewGame(this.state);

    Systems.Setup.setupSceneElements(this.state);

    UIManager.init();

    Shop.Shop.init();
    ResultsUI.create();

    AudioManager.playMusic('music_battlemap_vetruv');

    Systems.ShopPhase.initializeShopPhase();

  }

  update(time: number, delta: number): void {
    Shop.UI.update(time);
    Board.update(time);

    this.runCombatSystem.updateFrame(time, delta);
  }

  startCombatTimer(): void {
    this.timerValue = 10;
    const centerX = this.scale.width / 2;
    const centerY = 50;

    // Add a circle background
    this.timerCircle = this.add.circle(centerX, centerY, 40, 0x000000, 0.8);
    this.timerCircle.setStrokeStyle(4, 0xffffff);
    this.timerCircle.setDepth(1000);

    this.timerText = this.add.text(centerX, centerY, this.timerValue.toString(), {
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);
    this.timerText.setDepth(1001);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  updateTimer(): void {
    this.timerValue--;
    this.timerText.setText(this.timerValue.toString());
    if (this.timerValue <= 0) {
      this.timerEvent?.destroy();
      // Keep the timer visible at 0
    }
  }

  stopCombatTimer(): void {
    this.timerEvent?.destroy();
    if (this.timerText) {
      this.timerText.destroy();
    }
    if (this.timerCircle) {
      this.timerCircle.destroy();
    }
  }
}

export default BattlegroundScene;
