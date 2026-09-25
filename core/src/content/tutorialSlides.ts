/**
 * Tutorial slide content for the Title screen overlay.
 *
 * Pure, engine-agnostic presentation data: i18n keys, positions, and demo
 * scene specs. The Phaser client renders it via its own render layer
 * (`phaser/src/Screens/Title/Components/renderTutorialSlide.ts`).
 */

/** A unit placed on the tutorial demo board. */
export interface TutorialDemoUnit {
  cardId: string;
  force: string;
  position: [number, number];
}

/** The looping FX a tutorial demo can play between two units. */
export type TutorialFxKind = "damage" | "shield" | "heal" | "regen" | "poison";

/** A floating "+x"/"-x" text shown over the target when FX fires. */
export interface TutorialPopText {
  sign: "+" | "-";
  /** "power" = full unit power; "powerTenth" = floor(power / 10). */
  value: "power" | "powerTenth";
  /** popText visual kind (drives the text color/icon). */
  kind: "damage" | "shield" | "heal" | "poison";
}

/**
 * A looping cast demo (slides 3–5): the caster plays an attack animation,
 * then FX fires at the target, then repeats after `loopDelayMs`.
 */
export interface TutorialCastLoop {
  casterIndex: number;
  targetIndex: number;
  fx: TutorialFxKind;
  popText: TutorialPopText;
  /** Time between FX firings (measured from the start of each attack). */
  loopDelayMs?: number;
  /** Delay between the attack animation start and the FX firing. */
  fxDelayMs: number;
}

/**
 * A repeating status-counter demo (slides 6–7): after the one-shot cast FX,
 * a counter pops every `delayMs` (regen heals / poison damages).
 */
export interface TutorialStatusTick {
  delayMs: number;
  popText: TutorialPopText;
}

/** A unit-showcase panel (slides 10–13): unit tooltip beside the board. */
export interface TutorialShowcase {
  /** Index into `units` of the unit whose tooltip is shown. */
  unitIndex: number;
  panelX: number;
  titleY: number;
  descriptionY: number;
}

export interface TutorialDemoItem {
  kind: "demo";
  units: TutorialDemoUnit[];
  castLoop?: TutorialCastLoop;
  statusTick?: TutorialStatusTick;
  showcase?: TutorialShowcase;
}

/** A body text row (defaultTextConfig, 38px). */
export interface TutorialTextItem {
  kind: "text";
  key: string;
  y: number;
  /** Horizontal offset from the screen center; defaults to center. */
  x?: number;
}

/** A title text row (titleTextConfig). */
export interface TutorialTitleItem {
  kind: "title";
  key: string;
  y: number;
  /** Horizontal offset from the screen center; defaults to center. */
  x?: number;
}

/** ABILITY_COLORS keys used by tutorial BBCode rows. */
export type TutorialAbilityColorKey =
  | "damage"
  | "shield"
  | "heal"
  | "regen"
  | "poison"
  | "haste"
  | "slow"
  | "charge"
  | "increase_power"
  | "increase_critical"
  | "on_crit"
  | "on_over_heal"
  | "on_battle_start"
  | "on_crystal_hit"
  | "every_100_damage"
  | "every_100_shield"
  | "every_100_heal"
  | "every_10_poison"
  | "every_10_regen";

/**
 * A labelled BBCode row: `[color=…]label[/color]: text`. Either `labelKey`
 * (i18n) or `label` (literal) must be set.
 */
export interface TutorialBbcItem {
  kind: "bbcode";
  y: number;
  color: TutorialAbilityColorKey;
  labelKey?: string;
  label?: string;
  textKey: string;
}

export type TutorialSlideItem =
  TutorialTextItem | TutorialTitleItem | TutorialBbcItem | TutorialDemoItem;

export type TutorialSlide = TutorialSlideItem[];

/**
 * Demo-only force id. The demo board lays out on the right (enemy) board grid
 * and uses negative x positions to spread left of it, so this value must stay
 * distinct from FORCE_ID_PLAYER/FORCE_ID_CPU: `Chara.getScreenPosition` keys
 * the board offset off those two ids, and any other value uses the right-board
 * offset without mirroring the sprite.
 */
const DEMO_FORCE = "DEMO";

export const TUTORIAL_SLIDES: TutorialSlide[] = [
  // ── Slide 1: goal of the game ──────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide1.row1", y: 100 },
    { kind: "text", key: "tutorial.slide1.row2", y: 150 },
    { kind: "text", key: "tutorial.slide1.row3", y: 200 },
    {
      kind: "demo",
      units: [
        { cardId: "mana_crystal", force: DEMO_FORCE, position: [-2, 0.5] },
        {
          cardId: "protective_crystal",
          force: DEMO_FORCE,
          position: [0, 0.5],
        },
      ],
    },
    { kind: "title", key: "tutorial.slide1.row4", y: 620, x: -330 },
    { kind: "title", key: "tutorial.slide1.row5", y: 620, x: 200 },
  ],
  // ── Slide 2: recruiting units ──────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide2.row1", y: 100 },
    { kind: "text", key: "tutorial.slide2.row2", y: 150 },
    { kind: "text", key: "tutorial.slide2.row3", y: 200 },
    {
      kind: "demo",
      units: [
        { cardId: "void_spawn", force: DEMO_FORCE, position: [-1.7, 0.3] },
        { cardId: "commander", force: DEMO_FORCE, position: [-0.7, 0.3] },
        { cardId: "battle_medic", force: DEMO_FORCE, position: [0.3, 0.3] },
        { cardId: "symbiote", force: DEMO_FORCE, position: [-1.7, 1.3] },
        { cardId: "plague_dr", force: DEMO_FORCE, position: [-0.7, 1.3] },
        { cardId: "arbiter", force: DEMO_FORCE, position: [0.3, 1.3] },
      ],
    },
  ],
  // ── Slide 3: damage ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide3.row1", y: 100 },
    {
      kind: "bbcode",
      y: 150,
      color: "damage",
      labelKey: "tooltip.effects.damage",
      textKey: "tutorial.slide3.row2",
    },
    { kind: "text", key: "tutorial.slide3.row3", y: 200 },
    {
      kind: "demo",
      units: [
        { cardId: "avatar_of_anger", force: DEMO_FORCE, position: [-2, 0.5] },
        {
          cardId: "protective_crystal",
          force: DEMO_FORCE,
          position: [0, 0.5],
        },
      ],
      castLoop: {
        casterIndex: 0,
        targetIndex: 1,
        fx: "damage",
        popText: { sign: "-", value: "power", kind: "damage" },
        loopDelayMs: 3000,
        fxDelayMs: 1000,
      },
    },
  ],
  // ── Slide 4: shield ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide4.row1", y: 100 },
    {
      kind: "bbcode",
      y: 150,
      color: "shield",
      labelKey: "tooltip.effects.shield",
      textKey: "tutorial.slide4.row2",
    },
    {
      kind: "demo",
      units: [
        { cardId: "living_armor", force: DEMO_FORCE, position: [0, 0.5] },
        { cardId: "mana_crystal", force: DEMO_FORCE, position: [-1, 0.5] },
      ],
      castLoop: {
        casterIndex: 0,
        targetIndex: 1,
        fx: "shield",
        popText: { sign: "+", value: "power", kind: "shield" },
        loopDelayMs: 3000,
        fxDelayMs: 1000,
      },
    },
  ],
  // ── Slide 5: heal ──────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide5.row1", y: 100 },
    {
      kind: "bbcode",
      y: 150,
      color: "heal",
      labelKey: "tooltip.effects.heal",
      textKey: "tutorial.slide5.row2",
    },
    {
      kind: "demo",
      units: [
        { cardId: "battle_medic", force: DEMO_FORCE, position: [0, 0.5] },
        { cardId: "mana_crystal", force: DEMO_FORCE, position: [-1, 0.5] },
      ],
      castLoop: {
        casterIndex: 0,
        targetIndex: 1,
        fx: "heal",
        popText: { sign: "+", value: "power", kind: "heal" },
        loopDelayMs: 3000,
        fxDelayMs: 1000,
      },
    },
  ],
  // ── Slide 6: regen ─────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide6.row1", y: 100 },
    {
      kind: "bbcode",
      y: 150,
      color: "regen",
      labelKey: "tooltip.effects.regen",
      textKey: "tutorial.slide6.row2",
    },
    {
      kind: "demo",
      units: [
        { cardId: "enchanted_tree", force: DEMO_FORCE, position: [0, 0.5] },
        { cardId: "mana_crystal", force: DEMO_FORCE, position: [-1, 0.5] },
      ],
      castLoop: {
        casterIndex: 0,
        targetIndex: 1,
        fx: "regen",
        popText: { sign: "+", value: "powerTenth", kind: "heal" },
        fxDelayMs: 1000,
      },
      statusTick: {
        delayMs: 1000,
        popText: { sign: "+", value: "powerTenth", kind: "heal" },
      },
    },
  ],
  // ── Slide 7: poison ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide7.row1", y: 100 },
    {
      kind: "bbcode",
      y: 150,
      color: "poison",
      labelKey: "tooltip.effects.poison",
      textKey: "tutorial.slide7.row2",
    },
    {
      kind: "demo",
      units: [
        { cardId: "venomous_viper", force: DEMO_FORCE, position: [-2, 0.5] },
        { cardId: "mana_crystal", force: DEMO_FORCE, position: [0, 0.5] },
      ],
      castLoop: {
        casterIndex: 0,
        targetIndex: 1,
        fx: "poison",
        popText: { sign: "-", value: "powerTenth", kind: "poison" },
        fxDelayMs: 1000,
      },
      statusTick: {
        delayMs: 1000,
        popText: { sign: "-", value: "powerTenth", kind: "poison" },
      },
    },
  ],
  // ── Slide 8: advanced abilities ────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide8.row1", y: 100 },
    { kind: "text", key: "tutorial.slide8.row2", y: 150 },
    {
      kind: "bbcode",
      y: 200,
      color: "haste",
      labelKey: "tooltip.effects.haste",
      textKey: "tutorial.slide8.row3",
    },
    {
      kind: "bbcode",
      y: 250,
      color: "slow",
      labelKey: "tooltip.effects.slow",
      textKey: "tutorial.slide8.row4",
    },
    {
      kind: "bbcode",
      y: 300,
      color: "charge",
      labelKey: "tooltip.effects.charge",
      textKey: "tutorial.slide8.row5",
    },
    {
      kind: "bbcode",
      y: 350,
      color: "increase_power",
      label: "+x",
      textKey: "tutorial.slide8.row6",
    },
    {
      kind: "bbcode",
      y: 400,
      color: "increase_power",
      label: "+x*",
      textKey: "tutorial.slide8.row7",
    },
    {
      kind: "bbcode",
      y: 450,
      color: "increase_critical",
      label: "+x% crit",
      textKey: "tutorial.slide8.row8",
    },
  ],
  // ── Slide 9: reactions ─────────────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide9.row1", y: 100 },
    { kind: "text", key: "tutorial.slide9.row3", y: 160 },
    { kind: "text", key: "tutorial.slide9.row2", y: 220 },
    { kind: "text", key: "tutorial.slide9.row4", y: 280 },
    { kind: "text", key: "tutorial.slide9.row5", y: 340 },
    { kind: "text", key: "tutorial.slide9.row6", y: 400 },
  ],
  // ── Slide 10: example unit (thunder_conduit) ───────────────────────────
  [
    { kind: "title", key: "tutorial.slide10.row1", y: 100 },
    {
      kind: "demo",
      units: [
        { cardId: "thunder_conduit", force: DEMO_FORCE, position: [-2, 0.5] },
      ],
      showcase: { unitIndex: 0, panelX: 800, titleY: 300, descriptionY: 360 },
    },
    { kind: "text", key: "tutorial.slide10.row2", y: 600 },
  ],
  // ── Slide 11: example unit (gunslinger) ────────────────────────────────
  // The demo also shows the ally the reaction watches: the unit to its left.
  [
    { kind: "title", key: "tutorial.slide11.row1", y: 100 },
    {
      kind: "demo",
      units: [
        { cardId: "gunslinger", force: DEMO_FORCE, position: [-2, 0.5] },
        { cardId: "living_armor", force: DEMO_FORCE, position: [-3, 0.5] },
      ],
      showcase: { unitIndex: 0, panelX: 800, titleY: 300, descriptionY: 360 },
    },
    { kind: "text", key: "tutorial.slide11.row2", y: 600 },
    { kind: "text", key: "tutorial.slide11.row3", y: 650 },
  ],
  // ── Slide 12: example unit (radiance_envoy) ────────────────────────────
  // The extra unit shares the envoy's row, so the positional half of the
  // reaction is visible on the demo board.
  [
    { kind: "title", key: "tutorial.slide12.row1", y: 100 },
    {
      kind: "demo",
      units: [
        { cardId: "radiance_envoy", force: DEMO_FORCE, position: [-3, 0.5] },
        { cardId: "commander", force: DEMO_FORCE, position: [-2, 0.5] },
      ],
      showcase: { unitIndex: 0, panelX: 800, titleY: 300, descriptionY: 360 },
    },
    { kind: "text", key: "tutorial.slide12.row2", y: 600 },
    { kind: "text", key: "tutorial.slide12.row3", y: 650 },
  ],
  // ── Slide 13: example unit (grove_guardian) ────────────────────────────
  // The demo shows the ally on its right — the one the reaction empowers.
  [
    { kind: "title", key: "tutorial.slide13.row1", y: 100 },
    {
      kind: "demo",
      units: [
        { cardId: "grove_guardian", force: DEMO_FORCE, position: [-3, 0.5] },
        { cardId: "avatar_of_anger", force: DEMO_FORCE, position: [-2, 0.5] },
      ],
      showcase: { unitIndex: 0, panelX: 800, titleY: 300, descriptionY: 360 },
    },
    { kind: "text", key: "tutorial.slide13.row2", y: 600 },
    { kind: "text", key: "tutorial.slide13.row3", y: 650 },
    { kind: "text", key: "tutorial.slide13.row4", y: 700 },
  ],
  // ── Slide 14: reaction triggers (global reactions) ─────────────────────
  [
    { kind: "title", key: "tutorial.slide14.row1", y: 100 },
    { kind: "text", key: "tutorial.slide14.row2", y: 150 },
    {
      kind: "bbcode",
      y: 205,
      color: "on_crit",
      labelKey: "tooltip.effects.on_crit",
      textKey: "tutorial.slide14.row3",
    },
    {
      kind: "bbcode",
      y: 252,
      color: "every_100_damage",
      labelKey: "tooltip.effects.every_100_damage",
      textKey: "tutorial.slide14.row4",
    },
    {
      kind: "bbcode",
      y: 299,
      color: "every_100_shield",
      labelKey: "tooltip.effects.every_100_shield",
      textKey: "tutorial.slide14.row4",
    },
    {
      kind: "bbcode",
      y: 346,
      color: "every_100_heal",
      labelKey: "tooltip.effects.every_100_heal",
      textKey: "tutorial.slide14.row4",
    },
    {
      kind: "bbcode",
      y: 393,
      color: "every_10_poison",
      labelKey: "tooltip.effects.every_10_poison",
      textKey: "tutorial.slide14.row5",
    },
    {
      kind: "bbcode",
      y: 440,
      color: "every_10_regen",
      labelKey: "tooltip.effects.every_10_regen",
      textKey: "tutorial.slide14.row5",
    },
    {
      kind: "bbcode",
      y: 487,
      color: "on_over_heal",
      labelKey: "tooltip.effects.on_over_heal",
      textKey: "tutorial.slide14.row6",
    },
    {
      kind: "bbcode",
      y: 534,
      color: "on_battle_start",
      labelKey: "tooltip.effects.on_battle_start",
      textKey: "tutorial.slide14.row7",
    },
    {
      kind: "bbcode",
      y: 581,
      color: "on_crystal_hit",
      labelKey: "tooltip.effects.on_crystal_hit",
      textKey: "tutorial.slide14.row8",
    },
    { kind: "text", key: "tutorial.slide14.row9", y: 645 },
  ],
  // ── Slide 15: ranking units up ─────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide15.row1", y: 100 },
    { kind: "text", key: "tutorial.slide15.row2", y: 175 },
    { kind: "text", key: "tutorial.slide15.row3", y: 225 },
    { kind: "text", key: "tutorial.slide15.row4", y: 300 },
    { kind: "text", key: "tutorial.slide15.row5", y: 350 },
    { kind: "text", key: "tutorial.slide15.row6", y: 400 },
    { kind: "text", key: "tutorial.slide15.row7", y: 450 },
    { kind: "text", key: "tutorial.slide15.row8", y: 495 },
  ],
  // ── Slide 16: finishing a run ──────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide16.row1", y: 100 },
    { kind: "text", key: "tutorial.slide16.row2", y: 180 },
    { kind: "text", key: "tutorial.slide16.row3", y: 230 },
    { kind: "text", key: "tutorial.slide16.row4", y: 280 },
    { kind: "text", key: "tutorial.slide16.row5", y: 330 },
  ],
  // ── Slide 17: wrap-up ──────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide17.row1", y: 200 },
    { kind: "text", key: "tutorial.slide17.row2", y: 250 },
    { kind: "text", key: "tutorial.slide17.row3", y: 300 },
    { kind: "text", key: "tutorial.slide17.row4", y: 350 },
  ],
];
