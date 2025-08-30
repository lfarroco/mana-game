import Phaser from "phaser";
import { preload } from "./preload";
import { State, getState } from "@Models/State";
import * as UIManager from "../../UI";
import { Chara } from "@Systems/Chara";
import { CardCollection } from "@Models/Entities/Card";
import * as Board from "@Models/Board";
import { RunCombatSystem } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Shop from "./Systems/Shop";
import * as MoraleDisplay from "./MoraleDisplay";
import * as Systems from "./Systems"

export let scene: BattlegroundScene;

export class BattlegroundScene extends Phaser.Scene {
  state: State;
  bgContainer!: Container;
  cloudsBackground!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  runCombatSystem: RunCombatSystem;

  cleanup() {
    Chara.clearAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    Systems.Setup.destroy();

    MoraleDisplay.destroy();
    UIManager.destroy();
    Shop.UI.destroy();

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

    AudioManager.playMusic('music_battlemap_vetruv');

    Systems.Progression.transitionToShopPhase();

  }

  update(time: number, delta: number): void {
    Shop.UI.update(time);
    Board.update(time);

    this.runCombatSystem.updateFrame(time, delta);
  }
}

export default BattlegroundScene;
