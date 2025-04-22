import Phaser from "phaser";
import { preload } from "./preload";
import * as CharaSystem from "../../Systems/Chara/Chara";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as AISystem from "../../Systems/AI/AI";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import * as constants from "./constants";
import * as UIManager from "./Systems/UIManager";
import * as UnitManager from "./Systems/UnitManager";
import * as WaveManager from "./Systems/WaveManager";
import * as GridSystem from "./Systems/GridSystem";
import * as ChoiceSystem from "./Systems/Choice";
import * as EventSystem from "../../Models/Encounters/Encounter";
import * as TraitSystem from "../../Models/Traits";
import * as TooltipSystem from "../../Systems/Tooltip";

export class BattlegroundScene extends Phaser.Scene {

  state: State;
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

    /**
     * Global listeners can be created here because they are only created once
     */
    // TODO: separate scene-related listeners from state listeners
    AISystem.init(state);
    BattlegroundAudioSystem_init(state, this);
    CharaSystem.init(this);
    //StoreSystem.init(this);

    UnitManager.init(this);
    UIManager.init(this);
    WaveManager.init(this);
    GridSystem.init(this);

    ChoiceSystem.init(this);

    EventSystem.init(this);

    TraitSystem.init(this, state)

    TooltipSystem.init(this);

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

    const { tiles, hoverOutline } = GridSystem.createTileGrid();
    this.bgContainer.add([this.bgImage, tiles, hoverOutline]);
    UIManager.createDropZone(this);
    UIManager.updateUI();

    //@ts-ignore
    window.scene = this;

    await EventSystem.evalEvent(EventSystem.starterEvent);

    // Infinite day loop
    while (true) {
      console.log("Day", state.gameData.day, "started");

      // Hours loop for each day
      while (state.gameData.hour < 3) {
        state.gameData.hour += 1;

        await EventSystem.displayRandomEvents(state.gameData.day);

        UIManager.updateUI();
      }

      // End of day events
      await EventSystem.displayMonsterEvents(state.gameData.day);

      // Move to next day
      state.gameData.day += 1;
      state.gameData.hour = 1;

      state.gameData.player.gold += state.gameData.player.income;

      UIManager.updateUI();

    }

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;