/**
 * Tutorial slide content for the interactive tutorial (see
 * docs/interactive-tutorial.md).
 *
 * Pure, engine-agnostic presentation data: i18n keys, positions, demo
 * scene specs, and the *gate* that decides when a slide has been understood
 * (the player completed its interaction and Next unlocks). The Phaser client
 * renders it via its own render layer
 * (`phaser/src/Screens/Title/Components/Tutorial/`).
 *
 * The sandbox rules the interactive slides run on live in
 * `tutorialSandbox.ts` — also pure, and unit-tested there.
 */

import type { SandboxAbility } from "./tutorialSandbox";

/**
 * A unit placed on the tutorial demo board.
 *
 * `position` is a board cell `[0..2, 0..2]` (used by the board demos). Slides
 * whose layout needs exact control — the sandbox and inspector panels, which
 * reserve screen regions for the palette and readout — set `screen` instead:
 * explicit screen pixels, so a unit can never land on top of a chip or a panel.
 * Exactly one of the two is required.
 */
export interface TutorialDemoUnit {
  cardId: string;
  force: string;
  position?: [number, number];
  /** Explicit screen position in pixels (takes precedence over `position`). */
  screen?: [number, number];
}

/** The looping FX a tutorial demo can play between two units. */
export type TutorialFxKind = "damage" | "shield" | "heal" | "regen" | "poison";

/** A floating "+x"/"-x" text shown over the target when FX fires. */
export interface TutorialPopText {
  sign: "+" | "-";
  /**
   * "power" = full unit power; "powerTenth" = floor(power / 10);
   * a number = that literal amount (e.g. a reaction's authored +2 power).
   */
  value: "power" | "powerTenth" | number;
  /** popText visual kind (drives the text color/icon). */
  kind: "damage" | "shield" | "heal" | "poison";
}

/**
 * A looping cast demo (slides 3–7): the caster plays an attack animation,
 * then — when `fx` is set — the FX fires at the target, then repeats after
 * `loopDelayMs`.
 *
 * The interactive sandbox slides leave `fx` unset: the sandbox owns the
 * numbers and the FX, so the demo only contributes the caster's attack
 * animation. `firstTickAfterMs` delays the first status tick past the attack
 * animation so a cast reads as "one action, then the counter starts".
 */
export interface TutorialCastLoop {
  casterIndex: number;
  targetIndex: number;
  /** FX to play on cast; omit on sandbox slides (the sandbox plays it). */
  fx?: TutorialFxKind;
  popText: TutorialPopText;
  /** Time between FX firings (measured from the start of each attack). */
  loopDelayMs?: number;
  /** Delay between the attack animation start and the FX firing. */
  fxDelayMs: number;
  /** Delay between the attack animation and the first status tick. */
  firstTickAfterMs?: number;
}

/**
 * A repeating status-counter demo: after the one-shot cast FX, a counter pops
 * every `delayMs` (regen heals / poison damages).
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

// ---------------------------------------------------------------------------
// Interactive gates
// ---------------------------------------------------------------------------

/**
 * What completes a slide's interaction. Data, not code: the render layer only
 * reports events (`cast` / `tick` / `select` / `flag`) and `slideProgress.ts`
 * is the single interpreter.
 */
export type TutorialGate =
  /** Cast each of these abilities at least once. */
  | { kind: "cast"; abilityIds: readonly string[] }
  /** Watch a status tick at least `count` times. */
  | { kind: "ticks"; count: number }
  /** Tap at least `count` inspectable rows. */
  | { kind: "selections"; count: number }
  /** Complete each of these named one-shot interactions. */
  | { kind: "flags"; flags: readonly string[] };

/** A named one-shot interaction the player performs on a slide. */
export interface TutorialFlag {
  /** Flag id reported when `trigger` completes. */
  id: string;
  /** Hit area, centred on the screen. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** i18n key for the floating label shown on hover / after completion. */
  labelKey: string;
}

/** The ability palette form used by authored slide content (colors pre-resolved). */
export interface SandboxAbilitySpec extends SandboxAbility {}

/**
 * Interactive simulation sandbox (slides 3–8).
 *
 * A caster unit stands beside a demo crystal; tapping an ability chip casts it
 * for real through `tutorialSandbox.castInSandbox` and the panel plays the
 * returned numbers back.
 */
export interface TutorialSandboxItem {
  kind: "sandbox";
  /** Crystal unit the abilities are cast at. */
  targetCardId: string;
  targetForce: string;
  /** Initial crystal life. Also the max, so "heal to full" is reachable. */
  life: number;
  initialShield?: number;
  initialPoison?: number;
  /** Demo units (caster first by convention). */
  units: TutorialDemoUnit[];
  /** Optional attack animation played when an ability is cast. */
  castLoop?: TutorialCastLoop;
  palette: readonly SandboxAbilitySpec[];
  /** Where the palette chips sit on the left of the board (one per chip). */
  paletteX: number;
  paletteStartY: number;
  paletteSpacingY: number;
  /** Wrap the palette into this many columns (default 1). */
  paletteColumns?: number;
  /** Where the live readout panel is drawn. */
  readoutX: number;
  readoutY: number;
  /** Optional prompt key explaining what to try first. */
  promptKey?: string;
  /** Gate that unlocks Next. */
  require?: TutorialGate;
}

/**
 * Drag-and-drop mini shop (slide 2): the player drags a real recruit card onto
 * a highlighted board tile, exactly like the real shop.
 */
export interface TutorialDragDropItem {
  kind: "dragDrop";
  /** Card the player drags out of the mini shop. */
  cardId: string;
  /** Where the shop card is drawn. */
  shopX: number;
  shopY: number;
  /** Demo units already on the board (the crystal). */
  units: TutorialDemoUnit[];
  /** Board cells that accept the card, as [cellX, cellY]. */
  targets: readonly (readonly [number, number])[];
  /** Gate that unlocks Next. */
  require?: TutorialGate;
}

/** One tappable effect row on an inspectable card. */
export interface TutorialInspectRow {
  id: string;
  /** Ability whose FX plays on the demo board when the row is tapped. */
  fx: TutorialFxKind;
  /**
   * Unit the FX fires from (index into the inspect item's `units`). Defaults to
   * the inspected unit itself.
   */
  sourceIndex?: number;
  /** Unit the FX hits. Defaults to the crystal (the last demo unit). */
  targetIndex?: number;
  /** Pop played at the FX target. */
  popText: TutorialPopText;
  /**
   * Optional delayed reaction pop: what the unit *gains* after reacting
   * ("this unit reacts to X → gains +2 power"). Played over `reactionIndex`.
   */
  reactionIndex?: number;
  reactionPop?: TutorialPopText;
  reactionDelayMs?: number;
  /** BBCode label (literal or i18n) describing the row. */
  color: TutorialAbilityColorKey;
  labelKey?: string;
  label?: string;
  textKey: string;
}

/**
 * Card inspector (slides 10–13): a real card with its authored effect rows; the
 * player taps a row and the matching FX plays on the demo board.
 */
export interface TutorialInspectItem {
  kind: "inspect";
  units: TutorialDemoUnit[];
  /** Unit whose tooltip is shown (index into `units`). */
  unitIndex: number;
  panelX: number;
  /** Y of the first inspect row. */
  rowsY: number;
  rowSpacingY: number;
  rows: readonly TutorialInspectRow[];
  /** Gate that unlocks Next. */
  require?: TutorialGate;
}

/** A canvas region the player must interact with (slide 1's two boards). */
export interface TutorialFlagItem {
  kind: "flags";
  flags: readonly TutorialFlag[];
  /** Gate that unlocks Next. */
  require?: TutorialGate;
}

export interface TutorialDemoItem {
  kind: "demo";
  units: TutorialDemoUnit[];
  castLoop?: TutorialCastLoop;
  statusTick?: TutorialStatusTick;
  showcase?: TutorialShowcase;
  /**
   * Optional interactive trigger: renders a button that fires the cast loop
   * once, and — after `reactionDelayMs` — pops `reactionPop` over
   * `reactionIndex` (the "reactions happen after actions" slide).
   */
  triggerLabelKey?: string;
  triggerX?: number;
  triggerY?: number;
  reactionIndex?: number;
  reactionPop?: TutorialPopText;
  reactionDelayMs?: number;
  /** Allow free-play demos to announce their own completion. */
  require?: TutorialGate;
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
  | "increase_critical";

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

export type TutorialInteractiveItem =
  | TutorialSandboxItem
  | TutorialDragDropItem
  | TutorialInspectItem
  | TutorialFlagItem;

export type TutorialSlideItem =
  | TutorialTextItem
  | TutorialTitleItem
  | TutorialBbcItem
  | TutorialDemoItem
  | TutorialInteractiveItem;

export type TutorialSlide = TutorialSlideItem[];

const PLAYER_FORCE = "PLAYER_FORCE";
const FORCE_PLAYER = "FORCE_PLAYER";

/** Crystal the sandbox casts at (matches the "Protect" board on slide 1). */
const CRYSTAL = "mana_crystal";

/**
 * Crystal life for every sandbox slide. Constant across slides so the numbers
 * a player learns on slide 3 still make sense on slide 7.
 */
const SANDBOX_LIFE = 500;

/**
 * The shared basic-ability palette (slides 3–7). Powers are the real bronze
 * cards' powers — 50 damage (avatar_of_anger), 50 shield, 30 heal
 * (battle_medic), 25 regen (enchanted_tree), 40 poison (venomous_viper) — so
 * the sandbox arithmetic is the arithmetic the game actually runs.
 */
const BASIC_PALETTE: readonly SandboxAbilitySpec[] = [
  { id: "damage", kind: "damage", power: 50, color: "damage" },
  { id: "shield", kind: "shield", power: 50, color: "shield" },
  { id: "heal", kind: "heal", power: 40, color: "heal" },
  { id: "regen", kind: "regen", power: 25, color: "regen", intervalMs: 1200 },
  {
    id: "poison",
    kind: "poison",
    power: 40,
    color: "poison",
    intervalMs: 1200,
  },
];

/** The advanced palette (slide 8): tempo and scaling abilities. */
const ADVANCED_PALETTE: readonly SandboxAbilitySpec[] = [
  ...BASIC_PALETTE,
  { id: "haste", kind: "haste", power: 0, color: "haste", toggle: true },
  { id: "slow", kind: "slow", power: 0, color: "slow", toggle: true },
  { id: "charge", kind: "charge", power: 0, color: "charge", toggle: true },
  {
    id: "power",
    kind: "increase_power",
    power: 20,
    color: "increase_power",
    toggle: true,
  },
  {
    id: "crit",
    kind: "increase_critical",
    power: 25,
    color: "increase_critical",
    toggle: true,
  },
];

/**
 * Sandbox layout, shared by every sandbox slide (1920×1080). Reserved regions
 * that must never hold a unit:
 *
 *   - palette chips   y 360..730, x 210..540 (column 1) / 570..900 (column 2)
 *   - readout panel   x 980..1420, y 210..610 (prompt text to y ~700)
 *   - Next button     x 1700..1920, y 440..640
 *   - Exit row        y >= 980
 *
 * Units are centred on a ~250px sprite, so the layout test reasons about a
 * ±125px box around each authored screen position.
 */
const SANDBOX_PALETTE_X = 210;
const SANDBOX_PALETTE_START_Y = 360;
const SANDBOX_PALETTE_SPACING = 74;
const SANDBOX_READOUT_X = 980;
const SANDBOX_READOUT_Y = 210;
/** Below both panels (the readout ends at y 520). */
const SANDBOX_CASTER_SCREEN: [number, number] = [1250, 780];
const SANDBOX_CRYSTAL_SCREEN: [number, number] = [1580, 780];

/** Caster + crystal pair. */
const sandboxUnits = (casterCardId: string): TutorialDemoUnit[] => [
  { cardId: casterCardId, force: PLAYER_FORCE, screen: SANDBOX_CASTER_SCREEN },
  { cardId: CRYSTAL, force: PLAYER_FORCE, screen: SANDBOX_CRYSTAL_SCREEN },
];

/** The attack animation a sandbox slide plays when a chip is tapped. */
const sandboxCastLoop = (): TutorialCastLoop => ({
  casterIndex: 0,
  targetIndex: 1,
  popText: { sign: "-", value: "power", kind: "damage" },
  fxDelayMs: 900,
  firstTickAfterMs: 1200,
});

/** Which ability each basic slide asks the player to cast first. */
const BASIC_CAST_GATE = (abilityId: string): TutorialGate => ({
  kind: "cast",
  abilityIds: [abilityId],
});

export const TUTORIAL_SLIDES: TutorialSlide[] = [
  // ── Slide 1: goal of the game ──────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide1.row1", y: 100 },
    { kind: "text", key: "tutorial.slide1.row2", y: 150 },
    { kind: "text", key: "tutorial.slide1.row3", y: 200 },
    {
      kind: "demo",
      units: [
        { cardId: "mana_crystal", force: PLAYER_FORCE, position: [0, 0.5] },
        {
          cardId: "protective_crystal",
          force: FORCE_PLAYER,
          position: [2, 0.5],
        },
      ],
    },
    { kind: "title", key: "tutorial.slide1.row4", y: 620, x: -330 },
    { kind: "title", key: "tutorial.slide1.row5", y: 620, x: 200 },
    {
      kind: "flags",
      flags: [
        {
          id: "protect",
          x: 620,
          y: 750,
          width: 460,
          height: 320,
          labelKey: "tutorial.tapProtect",
        },
        {
          id: "destroy",
          x: 1300,
          y: 750,
          width: 460,
          height: 320,
          labelKey: "tutorial.tapDestroy",
        },
      ],
      require: { kind: "flags", flags: ["protect", "destroy"] },
    },
  ],
  // ── Slide 2: recruiting units (drag & drop) ────────────────────────────
  [
    { kind: "text", key: "tutorial.slide2.row1", y: 100 },
    { kind: "text", key: "tutorial.slide2.row2", y: 150 },
    { kind: "text", key: "tutorial.slide2.row3", y: 200 },
    { kind: "text", key: "tutorial.slide2.row4", y: 250 },
    {
      kind: "dragDrop",
      cardId: "void_spawn",
      shopX: 1420,
      shopY: 640,
      units: [
        { cardId: "mana_crystal", force: PLAYER_FORCE, position: [1, 1] },
      ],
      // Left two columns: the shop card sits over the third.
      targets: [
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 2],
        [1, 2],
      ],
      require: { kind: "flags", flags: ["placed"] },
    },
  ],
  // ── Slide 3: damage ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide3.row1", y: 100 },
    {
      kind: "bbcode",
      y: 160,
      color: "damage",
      labelKey: "tooltip.effects.damage",
      textKey: "tutorial.slide3.row2",
    },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: SANDBOX_LIFE,
      units: sandboxUnits("avatar_of_anger"),
      castLoop: sandboxCastLoop(),
      palette: BASIC_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryDamage",
      require: BASIC_CAST_GATE("damage"),
    },
  ],
  // ── Slide 4: shield ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide4.row1", y: 100 },
    {
      kind: "bbcode",
      y: 160,
      color: "shield",
      labelKey: "tooltip.effects.shield",
      textKey: "tutorial.slide4.row2",
    },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: SANDBOX_LIFE,
      units: sandboxUnits("living_armor"),
      castLoop: sandboxCastLoop(),
      palette: BASIC_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryShield",
      // Shield AND damage: the lesson is the absorption, so the gate needs both.
      require: { kind: "cast", abilityIds: ["shield", "damage"] },
    },
  ],
  // ── Slide 5: heal ──────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide5.row1", y: 100 },
    {
      kind: "bbcode",
      y: 160,
      color: "heal",
      labelKey: "tooltip.effects.heal",
      textKey: "tutorial.slide5.row2",
    },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: SANDBOX_LIFE,
      initialShield: 0,
      initialPoison: 20,
      units: sandboxUnits("battle_medic"),
      castLoop: sandboxCastLoop(),
      palette: BASIC_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryHeal",
      require: BASIC_CAST_GATE("heal"),
    },
  ],
  // ── Slide 6: regen ─────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide6.row1", y: 100 },
    {
      kind: "bbcode",
      y: 160,
      color: "regen",
      labelKey: "tooltip.effects.regen",
      textKey: "tutorial.slide6.row2",
    },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: 400,
      units: sandboxUnits("enchanted_tree"),
      castLoop: sandboxCastLoop(),
      palette: BASIC_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryRegen",
      // Watch the counter tick at least twice — "every 1 second" is the lesson.
      require: { kind: "ticks", count: 2 },
    },
  ],
  // ── Slide 7: poison ────────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide7.row1", y: 100 },
    {
      kind: "bbcode",
      y: 160,
      color: "poison",
      labelKey: "tooltip.effects.poison",
      textKey: "tutorial.slide7.row2",
    },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: SANDBOX_LIFE,
      initialShield: 60,
      units: sandboxUnits("venomous_viper"),
      castLoop: sandboxCastLoop(),
      palette: BASIC_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryPoison",
      // The start shield + poison cast is the "ignores Shield" lesson.
      require: BASIC_CAST_GATE("poison"),
    },
  ],
  // ── Slide 8: advanced abilities ────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide8.row1", y: 100 },
    { kind: "text", key: "tutorial.slide8.row2", y: 160 },
    {
      kind: "sandbox",
      targetCardId: CRYSTAL,
      targetForce: PLAYER_FORCE,
      life: SANDBOX_LIFE,
      units: sandboxUnits("commander"),
      castLoop: sandboxCastLoop(),
      palette: ADVANCED_PALETTE,
      paletteX: SANDBOX_PALETTE_X,
      paletteStartY: SANDBOX_PALETTE_START_Y,
      paletteSpacingY: SANDBOX_PALETTE_SPACING,
      paletteColumns: 2,
      readoutX: SANDBOX_READOUT_X,
      readoutY: SANDBOX_READOUT_Y,
      promptKey: "tutorial.sandbox.tryAdvanced",
      require: {
        kind: "cast",
        abilityIds: ["haste", "slow", "charge", "power", "crit"],
      },
    },
  ],
  // ── Slide 9: reactions ─────────────────────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide9.row1", y: 100 },
    { kind: "text", key: "tutorial.slide9.row3", y: 200 },
    { kind: "text", key: "tutorial.slide9.row4", y: 250 },
    { kind: "text", key: "tutorial.slide9.row5", y: 300 },
    {
      kind: "demo",
      units: [
        { cardId: "thunder_conduit", force: PLAYER_FORCE, screen: [600, 620] },
        { cardId: "living_armor", force: PLAYER_FORCE, screen: [1100, 620] },
        { cardId: CRYSTAL, force: PLAYER_FORCE, screen: [1550, 620] },
      ],
      castLoop: {
        casterIndex: 1,
        targetIndex: 2,
        fx: "shield",
        popText: { sign: "+", value: "power", kind: "shield" },
        fxDelayMs: 800,
      },
      // thunder_conduit's reaction: "when any ally uses Haste, gain 5 power" —
      // the demo casts Shield, so the reaction pop is the authored +2.
      triggerLabelKey: "tutorial.slide9.trigger",
      triggerX: 1300,
      triggerY: 760,
      reactionIndex: 0,
      reactionPop: { sign: "+", value: 2, kind: "damage" },
      reactionDelayMs: 200,
      require: { kind: "flags", flags: ["reactionSeen"] },
    },
  ],
  // ── Slide 10: example unit (thunder_conduit) ───────────────────────────
  [
    { kind: "title", key: "tutorial.slide10.row1", y: 100 },
    {
      kind: "inspect",
      units: [
        { cardId: "thunder_conduit", force: FORCE_PLAYER, screen: [280, 560] },
        { cardId: CRYSTAL, force: FORCE_PLAYER, screen: [520, 560] },
      ],
      unitIndex: 0,
      panelX: 800,
      rowsY: 430,
      rowSpacingY: 90,
      rows: [
        {
          id: "cast",
          fx: "damage",
          popText: { sign: "-", value: "power", kind: "damage" },
          color: "damage",
          labelKey: "tooltip.effects.damage",
          textKey: "tutorial.slide10.cast",
        },
        {
          id: "react",
          fx: "shield",
          popText: { sign: "+", value: 2, kind: "damage" },
          color: "haste",
          labelKey: "tooltip.effects.haste",
          textKey: "tutorial.slide10.react",
          reactionIndex: 0,
          reactionPop: { sign: "+", value: 2, kind: "damage" },
          reactionDelayMs: 220,
        },
      ],
      require: { kind: "selections", count: 2 },
    },
  ],
  // ── Slide 11: example unit (gunslinger) ────────────────────────────────
  [
    { kind: "title", key: "tutorial.slide11.row1", y: 100 },
    {
      kind: "inspect",
      units: [
        { cardId: "gunslinger", force: FORCE_PLAYER, screen: [280, 560] },
        { cardId: CRYSTAL, force: FORCE_PLAYER, screen: [520, 560] },
      ],
      unitIndex: 0,
      panelX: 800,
      rowsY: 430,
      rowSpacingY: 90,
      rows: [
        {
          id: "cast",
          fx: "damage",
          popText: { sign: "-", value: "power", kind: "damage" },
          color: "damage",
          labelKey: "tooltip.effects.damage",
          textKey: "tutorial.slide11.row2",
        },
        {
          id: "react",
          fx: "shield",
          popText: { sign: "+", value: 200, kind: "shield" },
          color: "charge",
          labelKey: "tooltip.effects.charge",
          textKey: "tutorial.slide11.row3",
          reactionIndex: 0,
          reactionPop: { sign: "+", value: 200, kind: "shield" },
          reactionDelayMs: 220,
        },
      ],
      require: { kind: "selections", count: 2 },
    },
  ],
  // ── Slide 12: example unit (radiance_envoy) ────────────────────────────
  [
    { kind: "title", key: "tutorial.slide12.row1", y: 100 },
    {
      kind: "inspect",
      units: [
        { cardId: "radiance_envoy", force: FORCE_PLAYER, screen: [280, 560] },
        { cardId: CRYSTAL, force: FORCE_PLAYER, screen: [520, 560] },
      ],
      unitIndex: 0,
      panelX: 800,
      rowsY: 430,
      rowSpacingY: 90,
      rows: [
        {
          id: "cast",
          fx: "heal",
          popText: { sign: "+", value: "power", kind: "heal" },
          color: "heal",
          labelKey: "tooltip.effects.heal",
          textKey: "tutorial.slide12.row2",
        },
        {
          id: "react",
          fx: "shield",
          popText: { sign: "+", value: 1000, kind: "shield" },
          color: "haste",
          labelKey: "tooltip.effects.haste",
          textKey: "tutorial.slide12.row3",
          reactionIndex: 0,
          reactionPop: { sign: "+", value: 1000, kind: "shield" },
          reactionDelayMs: 220,
        },
      ],
      require: { kind: "selections", count: 2 },
    },
  ],
  // ── Slide 13: example unit (grove_guardian) ────────────────────────────
  [
    { kind: "title", key: "tutorial.slide13.row1", y: 100 },
    {
      kind: "inspect",
      units: [
        { cardId: "grove_guardian", force: FORCE_PLAYER, screen: [280, 560] },
        { cardId: CRYSTAL, force: FORCE_PLAYER, screen: [520, 560] },
      ],
      unitIndex: 0,
      panelX: 800,
      rowsY: 410,
      rowSpacingY: 90,
      rows: [
        {
          id: "cast",
          fx: "regen",
          popText: { sign: "+", value: "power", kind: "heal" },
          color: "regen",
          labelKey: "tooltip.effects.regen",
          textKey: "tutorial.slide13.cast",
        },
        {
          id: "charge",
          fx: "regen",
          popText: { sign: "+", value: 200, kind: "shield" },
          color: "charge",
          labelKey: "tooltip.effects.charge",
          textKey: "tutorial.slide13.charge",
          reactionIndex: 0,
          reactionPop: { sign: "+", value: 200, kind: "shield" },
          reactionDelayMs: 220,
        },
        {
          id: "react",
          fx: "damage",
          popText: { sign: "+", value: 4, kind: "damage" },
          color: "increase_power",
          label: "+x",
          textKey: "tutorial.slide13.row4",
          reactionIndex: 0,
          reactionPop: { sign: "+", value: 4, kind: "damage" },
          reactionDelayMs: 220,
        },
      ],
      require: { kind: "selections", count: 3 },
    },
  ],
  // ── Slide 14: wrap-up ──────────────────────────────────────────────────
  [
    { kind: "text", key: "tutorial.slide14.row1", y: 200 },
    { kind: "text", key: "tutorial.slide14.row2", y: 250 },
    { kind: "text", key: "tutorial.slide14.row3", y: 300 },
    { kind: "text", key: "tutorial.slide14.row4", y: 350 },
  ],
];

/**
 * The gate a slide requires, or `none` when it is free-play (slides 1's demo
 * companions and the wrap-up). Used by the overlay to decide whether Next is
 * unlocked and by the tests to assert every interactive slide is reachable.
 */
export const slideGate = (slide: TutorialSlide): TutorialGate | undefined => {
  for (const item of slide) {
    if (
      item.kind === "sandbox" ||
      item.kind === "dragDrop" ||
      item.kind === "inspect" ||
      item.kind === "flags" ||
      item.kind === "demo"
    ) {
      if (item.require) return item.require;
    }
  }
  return undefined;
};

/** Total number of slides. */
export const TUTORIAL_SLIDE_COUNT = TUTORIAL_SLIDES.length;
