import Phaser from "phaser";
import { preload } from "./preload";
import * as CharaSystem from "../../Systems/Chara/Chara";
import { emit, signals } from "../../Models/Signals";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as AISystem from "../../Systems/AI/AI";
import * as HPBarSystem from "../../Systems/Chara/HPBar";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import { Force, FORCE_ID_PLAYER } from "../../Models/Force";
import * as StoreSystem from "./Store";
import * as constants from "./constants";
import * as InterruptSystem from "./Systems/Interrupt";
import { setupEventListeners } from "./EventHandlers";
import * as UIManager from "./Systems/UIManager";
import * as UnitManager from "./Systems/UnitManager";
import * as WaveManager from "./Systems/WaveManager";
import * as GridSystem from "./Systems/GridSystem";

export class BattlegroundScene extends Phaser.Scene {

  state: State;
  playerForce: Force;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;

  cleanup() {
    UnitManager.clearCharas();
    this.time.removeAllEvents();
    GridSystem.resetGrid();
  }

  constructor() {
    super("BattlegroundScene");
    console.log("BattlegroundScene constructor")

    const state = getState();
    this.state = state;
    this.speed = state.options.speed;
    this.playerForce = state.gameData.forces.find(f => f.id === FORCE_ID_PLAYER)!;

    setupEventListeners(this);

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    AISystem.init(state);
    HPBarSystem.init(state, this);
    BattlegroundAudioSystem_init(state, this);
    CharaSystem.init(this);
    StoreSystem.init(this);
    InterruptSystem.init(this);

    UnitManager.init(this);
    UIManager.init(this);
    WaveManager.init(this);
    GridSystem.init(this);

    //@ts-ignore
    window.bg = this;

  }

  preload = preload;
  create = async (state: State) => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    this.sound.setVolume(0.05)

    console.log("BattlegroundScene create");

    this.bgImage = this.add.image(0, 0, 'bg').setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
      .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

    const { tiles, hoverOutline } = GridSystem.createTileGrid();

    this.bgContainer = this.add.container(0, 0);
    this.bgContainer.add([this.bgImage, tiles, hoverOutline]);

    ControlsSystem.init(this);

    //@ts-ignore
    window.scene = this;

    //this.cameras.main.setZoom(1.5)
    emit(signals.BATTLEGROUND_STARTED);

    UIManager.createDropZone(this);
    UIManager.updateUI();

    WaveManager.createWave();

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;