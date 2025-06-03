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
import * as GridSystem from "./Systems/GridSystem";
import * as ChoiceSystem from "./Systems/Choice";
import * as EventSystem from "../../Models/Encounters/Encounter";
import * as TraitSystem from "../../Models/Traits";
import * as TooltipSystem from "../../Systems/Tooltip";
import { CardCollection, getCard, registerCollection } from "../../Models/Card";
import runCombatIO from "./RunCombatIO";
import { battleResultAnimation } from "./battleResultAnimation";
import { delay } from "../../Utils/animation";
import { tavern } from "../../Models/Encounters/common";
import { images } from "../../assets";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { vignette } from "./Animations/vignette";
import { pickOne } from "../../utils";

export class BattlegroundScene extends Phaser.Scene {

  state: State;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;
  collection: CardCollection;

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
    GridSystem.init(this);

    ChoiceSystem.init(this);

    EventSystem.init(this);

    TraitSystem.init(this, state);

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

    const collection = this.cache.json.get("base-collection") as CardCollection;

    registerCollection(collection);

    this.collection = collection;

    // Load the card images dynamically

    collection.cards.forEach(card => {

      console.log("loading card", card.name, card.pic);
      this.load.image(card.name, card.pic);
    });

    this.load.once("complete", () => {
      console.log("All cards loaded");
      this.start();
    });

    this.load.start();

  }

  start = async () => {

    //@ts-ignore
    window.scene = this;

    const { state } = this;

    this.sound.setVolume(0.05)

    this.bgImage = this.add.image(
      0, 0,
      images.bg_forest.key,
    ).setDisplaySize(constants.SCREEN_WIDTH, constants.SCREEN_HEIGHT)
      .setPosition(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2);

    this.bgContainer = this.add.container(0, 0);

    ControlsSystem.init(this);

    this.bgContainer.add([this.bgImage]);
    UIManager.createDropZone(this); // TODO: move to board module
    UIManager.updateUI();

    await EventSystem.evalEvent(EventSystem.starterEvent);

    //Infinite day loop
    console.log("Day", this.state.gameData.day, "started");

    state.gameData.day = 1;
    // Hours loop for each day
    while (state.gameData.day < 5) {
      state.battleData.units = [];

      const possibleEnemies = this.collection.opponents.filter(enemy => enemy.level === state.gameData.day);

      const enemyCards = pickOne(possibleEnemies).cards.map(getCard)

      generateEnemyTeam(state, state.gameData.player.units.length, enemyCards);
      state.battleData.units = [...state.battleData.units, ...state.gameData.player.units];

      state.battleData.units
        .filter(u => u.force === constants.FORCE_ID_CPU)
        .forEach(unit => {
          UnitManager.summonChara(unit, false, false);
        });

      await new Promise<void>(resolve => {
        const start = UIManager.createButton("Start",
          constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 50,
          () => {
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

      const tavern_ = tavern();

      await ChoiceSystem.displayChoices([
        ChoiceSystem.newChoice(tavern_.pic, tavern_.title, tavern_.description, tavern_.id)
      ])

      await EventSystem.evalEvent(EventSystem.pickAHero);

      state.gameData.hour += 1;

      if (state.gameData.hour >= 12) {
        state.gameData.day += 1;
        state.gameData.hour = 1;
      }

    }

    vignette(this, "Thanks for playing!")

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;


