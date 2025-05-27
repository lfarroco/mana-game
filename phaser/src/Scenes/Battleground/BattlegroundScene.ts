import Phaser from "phaser";
import { preload } from "./preload";
import * as CharaSystem from "../../Systems/Chara/Chara";
import { State, getState } from "../../Models/State";
import * as ControlsSystem from "../../Systems/Controls/Controls";
import * as AISystem from "../../Systems/AI/AI";
import { BattlegroundAudioSystem_init } from "./Systems/Audio";
import * as constants from "./constants";
import * as UIManager from "./Systems/UIManager";
import * as UnitManager from "./Systems/CharaManager";
import * as WaveManager from "./Systems/WaveManager";
import * as GridSystem from "./Systems/GridSystem";
import * as ChoiceSystem from "./Systems/Choice";
import * as EventSystem from "../../Models/Encounters/Encounter";
import * as TraitSystem from "../../Models/Traits";
import * as TooltipSystem from "../../Systems/Tooltip";
import { makeUnit } from "../../Models/Unit";
import { playerForce } from "../../Models/Force";
import { ARCHER, CLERIC, KNIGHT } from "../../Models/Card";
import { vec2 } from "../../Models/Geometry";
import runCombatIO from "./RunCombatIO";
import { battleResultAnimation } from "./battleResultAnimation";
import { delay } from "../../Utils/animation";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { tavern } from "../../Models/Encounters/common";
import { Item, ITEMS } from "../../Models/Item";

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
  create = async (_state: State) => {
    /**
     * It is important to NOT create new global listeners here
     * TODO: add test to confirm that global listeners are not created here
     */

    this.sound.setVolume(0.05)

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

    const { state } = this;

    if (state.options.debug) {

      const units = [

        makeUnit(
          playerForce.id,
          KNIGHT,
          vec2(5, 1),
        ),
        makeUnit(
          playerForce.id,
          ARCHER,
          vec2(5, 2),
        ),
        makeUnit(
          playerForce.id,
          CLERIC,
          vec2(5, 3),
        )
      ]

      units.forEach(unit => {
        this.state.gameData.player.units.push(unit);
      });

      this.state.gameData.player.units.forEach(unit => {
        UnitManager.summonChara(unit)
      });

    } else {

      await EventSystem.evalEvent(EventSystem.starterEvent);

      //Infinite day loop
      console.log("Day", this.state.gameData.day, "started");

      // Hours loop for each day
      while (state.gameData.hour < 9) {
        state.battleData.units = [];

        generateEnemyTeam(state, state.gameData.player.units.length);
        state.battleData.units = [...state.battleData.units, ...state.gameData.player.units];

        UnitManager.clearCharas();

        state.battleData.units.forEach(unit => {
          UnitManager.summonChara(unit, false, false);
        });

        await new Promise<void>(resolve => {
          const start = UIManager.createButton("Start",
            constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 50,
            async () => {
              start.destroy();
              resolve();
            });
        });

        const result = await runCombatIO(this);

        await delay(this, 500)

        if (result === "player_won") {
          await battleResultAnimation(this, "victory");
        } else {
          await battleResultAnimation(this, "defeat");
        }

        console.log("Combat result", result);

        await new Promise<void>(resolve => {
          const start = UIManager.createButton("Continue",
            constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 50,
            async () => {
              start.destroy();
              resolve();
            });
        });

        UnitManager.clearCharas();

        state.gameData.player.units.forEach(unit => {
          unit.charge = 0;
          unit.refresh = 0;
          unit.slowed = 0;
          unit.hasted = 0;
          unit.hp = unit.maxHp;
          unit.statuses = {};
        })

        state.gameData.player.units.forEach(unit => {
          UnitManager.summonChara(unit);
        });

        const pool = Object.entries(ITEMS).map(([key, value]) => [key, value()] as [string, Item]);

        await ChoiceSystem.chooseItems(pool)

        const tavern_ = tavern();

        await ChoiceSystem.displayChoices([
          ChoiceSystem.newChoice(tavern_.pic, tavern_.title, tavern_.description, tavern_.id)
        ])

        await EventSystem.evalEvent(EventSystem.pickAHero);

        state.gameData.hour += 1;

      }

    }

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;


