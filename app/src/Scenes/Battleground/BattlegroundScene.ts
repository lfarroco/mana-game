import Phaser from "phaser";
import { preload } from "./preload";
import * as CharaSystem from "../../Systems/Chara/Chara";
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
import * as ChoiceSystem from "./Systems/Choice";
import { JobId, jobs } from "../../Models/Job";
import { pickRandom } from "../../utils";
import { signals, emit } from "../../Models/Signals";
import { vec2 } from "../../Models/Geometry";

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
    //StoreSystem.init(this);
    InterruptSystem.init(this);

    UnitManager.init(this);
    UIManager.init(this);
    WaveManager.init(this);
    GridSystem.init(this);

    ChoiceSystem.init(this);

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


    this.bgContainer = this.add.container(0, 0);


    ControlsSystem.init(this);

    //emit(signals.BATTLEGROUND_STARTED);

    //WaveManager.createWave();

    //@ts-ignore
    window.scene = this;

    // pick 3 random jobs

    const choice = await ChoiceSystem.displayChoices(
      "Who's your hero?",
      pickRandom(jobs, 3).map(job => ChoiceSystem.newChoice(
        `${job.id}/full`,
        job.name,
        job.description,
        job.id,
      )));

    emit(signals.ADD_UNIT_TO_GUILD, FORCE_ID_PLAYER, choice.value as JobId, vec2(7, 3));

    console.log(">>>", choice);

    const { tiles, hoverOutline } = GridSystem.createTileGrid();
    this.bgContainer.add([this.bgImage, tiles, hoverOutline]);
    UIManager.createDropZone(this);
    UIManager.updateUI();

    this.state.gameData.units.forEach(UnitManager.renderUnit);

    const skillChoice = await ChoiceSystem.displayChoices(
      "Choose a skill",
      [
        ChoiceSystem.newChoice("icon/fireball", "Fireball", "A powerful fireball", "fireball"),
        ChoiceSystem.newChoice("icon/arcane_missiles", "Arcane Missiles", "A barrage of arcane missiles", "arcane_missiles"),
      ]);

    console.log(">>>", skillChoice);

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;