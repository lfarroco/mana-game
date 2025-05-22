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
import { makeUnit } from "../../Models/Unit";
import { cpuForce, playerForce } from "../../Models/Force";
import { ARCHER, CLERIC, cards, KNIGHT, Card } from "../../Models/Card";
import { vec2 } from "../../Models/Geometry";
import runCombatIO from "./RunCombatIO";
import { pickOne } from "../../utils";
import { battleResultAnimation } from "./battleResultAnimation";
import { delay } from "../../Utils/animation";

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

        generateEnemyTeam(state);
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

        await delay(this, 1000)

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
        })

        state.gameData.player.units.forEach(unit => {
          UnitManager.summonChara(unit);
        });

        await EventSystem.evalEvent(EventSystem.pickAHero);

        state.gameData.hour += 1;

      }

      console.log("done!!!")

    }

  };

  playFx(key: string) {
    const audio = this.sound.add(key)
    audio.volume = this.state.options.soundVolume;
    audio.play();
  }

}

export default BattlegroundScene;

function generateEnemyTeam(state: State) {

  // t = tank
  // r = ranged dps
  // s = support
  // m = melee dps
  const templates: { [hour: number]: string[] } = {
    3: [
      `
    xxx
    rst
    xxx
    `,
      `
    xxm
    xsx
    xxm
    `,
      `
    xxx
    xxt
    rxm
    `
    ],
    4: [
      `
      rxm
      xxx
      rxm
      `,
      `
      xxx
      rsm
      xxm
      `,
      `
      xxm
      sxm
      xxm
      `,
      `
      rxx
      rxm
      rxx
      `
    ],
    5: [
      `
      rxm
      xxt
      rxm
      `,
      `
      rxt
      rst
      xxx
      `,
      `
      xxm
      rst
      xxm
      `,
    ],
    6: [
      `
      rxm
      rxm
      rxm
      `,
      `
      sxm
      xxt
      sxm
      `,
    ],
    7: [
      `
      rxm
      rsm
      rxm
      `,
      `
      rxt
      rsm
      rxt
      `,
      `
      sxt
      rsm
      sxt
      ` ,
    ],
    8: [
      `
      rxt
      rsm
      rst
      `,
      `
      srt
      sxt
      srt
      `,
    ],
    9: [
      `
      rst
      rst
      rst
      `,
      `
      rrm
      sst
      rrm
      `,
    ],
  }

  const template = pickOne(templates[state.gameData.hour + 2]);

  const parsed = template.split("\n")
    .filter(line => line.trim() !== "")
    .map(line => line.trim().split(""));

  const getRanged = () => cards.filter(c => c.traits.includes(TraitSystem.RANGED.id))
  const getMelee = () => cards.filter(c => c.traits.includes(TraitSystem.MELEE.id))
  const getSupport = () => cards.filter(c => c.traits.includes(TraitSystem.SUPPORT.id))
  const getTank = () => cards.filter(c => c.traits.includes(TraitSystem.TAUNT.id))

  for (let y = 0; y < parsed.length; y++) {
    const row = parsed[y];
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      let card: Card | undefined;
      switch (char) {
        case "r":
          card = pickOne(getRanged());
          break;
        case "m":
          card = pickOne(getMelee());
          break;
        case "s":
          card = pickOne(getSupport());
          break;
        case "t":
          card = pickOne(getTank());
          break;
        default:
          break;
      }
      if (card !== undefined) {
        state.battleData.units.push(makeUnit(cpuForce.id, card.id, vec2(x + 1, y + 1)));
      }
    }
  }

}
