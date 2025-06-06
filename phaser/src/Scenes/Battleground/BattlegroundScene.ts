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
import * as ChoiceSystem from "./Systems/Choice";
import * as EventSystem from "../../Models/Encounters/Encounter";
import * as TraitSystem from "../../Models/Traits";
import * as TooltipSystem from "../../Systems/Tooltip";
import { CardCollection, getAllCards, registerCollection } from "../../Models/Card";
import runCombatIO from "./RunCombatIO";
import { battleResultAnimation } from "./battleResultAnimation";
import { delay } from "../../Utils/animation";
import { images } from "../../assets";
import { generateEnemyTeam } from "./generateEnemyTeam";
import { vignette } from "./Animations/vignette";
import * as Shop from "./Systems/Shop";
import { updatePlayerGoldIO } from "../../Models/Force";
import { popText } from "../../Systems/Chara/Animations/popText";

export class BattlegroundScene extends Phaser.Scene {

  state: State;
  speed: number;
  bgContainer!: Phaser.GameObjects.Container;
  bgImage!: Phaser.GameObjects.Image;
  collection: CardCollection;

  cleanup() {
    UnitManager.clearCharas();
    this.time.removeAllEvents();
    this.children.removeAll(true);
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

    UnitManager.init(this);
    UIManager.init(this);

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

    state.gameData.player.gold = 0;
    state.gameData.player.units = [];
    state.gameData.player.relics = [];
    state.gameData.round = 1;
    updatePlayerGoldIO(10);

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


    const relicSlots = [[0, 0], [0, 1], [1, 0], [1, 1]]
    relicSlots.forEach(([x, y]) => {


      const x_ = 200 + x * 200;
      const y_ = 700 + y * 200;
      const w = 200;
      const h = 200;
      const zone = this.add.zone(x_, y_, w, h);
      zone.setOrigin(0.5);

      zone.setName(`slot-${x}-${y}`);

      zone.setRectangleDropZone(w, h);

      const dropZoneDisplay = this.add.graphics();
      dropZoneDisplay.lineStyle(2, 0xffff00);
      dropZoneDisplay.fillStyle(0x00ffff, 0.3);
      dropZoneDisplay.fillRect(
        x_ - w / 2, y_ - h / 2,
        w, h
      );
      dropZoneDisplay.strokeRect(
        x_ - w / 2, y_ - h / 2,
        w, h
      );

      this.add.image(
        x_, y_,
        images.slot.key,
      ).setOrigin(0.5)

    })

    await Shop.open(this);

    //await EventSystem.evalEvent(EventSystem.starterEvent);

    //Infinite day loop
    console.log("Round", this.state.gameData.round, "started");

    state.gameData.round = 1;
    let isGameOver = false;
    // Hours loop for each day
    while (!isGameOver) {
      state.battleData.units = [];

      const cardPool = getAllCards();

      const enemies = generateEnemyTeam(state.gameData.round, cardPool);
      state.battleData.units = [...enemies, ...state.gameData.player.units];

      state.battleData.units
        .filter(u => u.force === constants.FORCE_ID_CPU)
        .forEach(unit => {
          UnitManager.summonChara(unit, false, false);
        });

      const result = await runCombatIO(this);

      await delay(this, 500)

      console.log("Combat result", result);

      if (result === "player_won") {

        await battleResultAnimation(this, "victory");

        updatePlayerGoldIO(5)

      } else {
        await battleResultAnimation(this, "defeat");
        isGameOver = true;

        UIManager.createButton("new run", 300, 300, () => {
          this.cleanup();
          this.start();

        })
        UIManager.createButton("return to menu ", 300, 400, () => { this.scene.start("MainMenuScene") })
        break;
      }

      state.gameData.player.units.forEach(unit => {
        unit.charge = 0;
        unit.refresh = 0;
        unit.slowed = 0;
        unit.hasted = 0;
        unit.hp = unit.maxHp;
        unit.statuses = {};
      });

      state.gameData.player.units.forEach(unit => {
        popText({
          text: `+15 xp`,
          targetId: unit.id,
        });
      });

      await delay(this, 500);

      const xp = enemies.length * 15;

      let levelUp = false;
      state.gameData.player.units.forEach(unit => {
        unit.xp += xp;
        const levels = Math.floor(unit.xp / 100);
        if (levels > 0) {
          popText({
            text: `Level up!`,
            targetId: unit.id,
          });
          unit.xp = unit.xp - levels * 100;

          for (let i = 0; i < levels; i++) {
            unit.maxHp = unit.maxHp * 1.1;
            unit.hp = unit.maxHp;
            unit.attackPower += unit.attackPower * 0.1;
          }
          levelUp = true;
        }

        CharaSystem.updateHpDisplay(unit.id, unit.maxHp);
      });

      if (levelUp) {
        await delay(this, 1000);
      }

      await Shop.open(this);
      //await EventSystem.evalEvent(EventSystem.pickAHero);

      state.gameData.round += 1;

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


