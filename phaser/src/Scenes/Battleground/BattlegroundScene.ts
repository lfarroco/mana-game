import Phaser from "phaser";
import { preload } from "./preload";
import { GameData, setCurrentScene } from "@Models/State";
import * as UIManager from "../../UI/UI";
import { CardCollection } from "@Models/Entities/Card";
import * as Board from "@Models/Board";
import { RunCombatSystem } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as MoraleDisplay from "./MoraleDisplay";
import * as Systems from "./Systems"
import { clearAll } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";
import * as BoardStatsDisplay from "./BoardStatsDisplay";
import * as Tooltip from "@Components/Tooltip";
import { resetBoard, startPhase } from "./PhaseManager";
import * as SellZone from "./Systems/Shop/SellZone";

export let scene: BattlegroundScene;

export class BattlegroundScene extends Phaser.Scene {
  bgContainer!: Phaser.GameObjects.Container;
  cloudsBackground!: Phaser.GameObjects.Image;
  collection!: CardCollection;
  runCombatSystem: RunCombatSystem;

  cleanup() {
    clearAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);

    Systems.Setup.destroy();

    MoraleDisplay.destroy();
    UIManager.destroy();
    ResultsUI.destroy();
    BoardStatsDisplay.destroy();

  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    this.runCombatSystem = new RunCombatSystem();
  }

  preload = preload;

  create = async (data?: GameData) => {
    console.log(":::: BattlegroundScene creating logic...", data)
    setCurrentScene(this);
    scene = this;

    this.collection = this.cache.json.get("base-collection") as CardCollection;

    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    const speed = getOption("speed");

    this.time.timeScale = speed;
    this.tweens.timeScale = speed;

    this.start(data);


  }

  start = async (data?: GameData) => {
    console.log(":::: BattlegroundScene starting logic...", data);


    if (data?.player) {
      state.gameData = data;
    } else {
      Systems.Setup.initializeNewGame();
    }

    Systems.Loader.init(this.collection);
    Systems.Loader.loadDynamicAssets(this.collection)

    Systems.Setup.setupSceneElements();

    UIManager.init();
    Tooltip.init();

    Systems.CountdownTimer.initializeCountdownTimer(this);

    MoraleDisplay.init();
    ResultsUI.create();
    BoardStatsDisplay.init();

    SellZone.create();

    AudioManager.playMusic('music_battlemap_vetruv');

    resetBoard(true);
    startPhase();

  }

  update(time: number, delta: number): void {
    Board.update(time);

    this.runCombatSystem.updateFrame(time, delta);
  }
}

export default BattlegroundScene;
