# Interactive Tutorial

> Designed & implemented 2026-09-12. Replaces the passive slideshow with an
> interactive one: same 14 lessons, but each slide makes the player *use* the
> mechanic before it lets them continue.

## 1. Why

The old tutorial (`Title` → pulsing "How to play" → `TutorialOverlay`) was 14
slides of text with looping FX animations. The player read about damage, shield,
poison and reactions but never *did* anything, so nothing stuck. The
player-facing ask was "make it interactive, not a slideshow".

Design decisions taken with the maintainer:

| Decision        | Choice                                                            |
| :-------------- | :---------------------------------------------------------------- |
| Shape           | Keep the 14-slide structure, make the slides interactive          |
| Gating          | Every interactive slide gates **Next** on completing its action   |
| Interaction set | Simulation sandbox · drag-and-drop mini shop · card inspector     |
| Entry           | Auto-offer on first-ever launch **and** a permanent menu entry    |
| Existing slides | Kept as the "Manual / Mechanics reference" from the pause menu    |

## 2. Architecture

Same two-layer split the slideshow already used (purify C1), extended with
interaction state:

```
core/src/content/tutorialSlides.ts     ← pure slide data (keys, layout, demos, gates)
core/src/content/tutorialSandbox.ts    ← pure simulation of the sandbox state machine
        │
phaser/src/Screens/Title/Components/Tutorial/
        ├─ buildTutorialSlide.ts       ← slide data → Phaser objects + interactions
        ├─ sandboxPanel.ts             ← ability palette, bars, live numbers
        ├─ dragDropPanel.ts            ← mini shop + board drop zone
        ├─ inspectorPanel.ts           ← card breakdown with tap-to-play rows
        └─ slideProgress.ts            ← per-slide gate bookkeeping
```

Everything numeric (damage vs. shield, poison piercing, heal clearing poison,
regen ticks) lives in `core/` as pure functions and is unit-tested there; the
Phaser layer only plays the returned values back as animation.

### Content model

`TutorialSlideItem` gains three interactive kinds next to the existing
`text` / `title` / `bbcode` / `demo`:

| Kind       | Purpose                                                                |
| :--------- | :--------------------------------------------------------------------- |
| `sandbox`  | Crystal target + ability palette + live life/shield/poison/regen panel |
| `dragDrop` | One shop card the player must drag onto a highlighted board tile       |
| `inspect`  | A real card with tappable effect rows that animate on the mini board   |

`require` marks the interaction that unlocks **Next**. A slide without a
`require` is free-play (slides 1 and 14). `advance` declares what counts as
"done" so the rule is data, not code:

```ts
type TutorialGate =
  | { kind: "cast"; abilityIds: string[] }      // fire each of these at least once
  | { kind: "ticks"; abilityId: string; count: number } // watch N status ticks
  | { kind: "selections"; count: number }        // inspect N effect rows
  | { kind: "flags"; flags: string[] };          // named one-shot interactions
```

The gate lives on the interaction item, and `slideProgress.ts` is the only
place that interprets it — the render layer just reports events
(`cast`, `tick`, `select`, `flag`).

## 3. Lesson plan (14 slides)

| # | Lesson | Interaction (gates Next) |
| :- | :--- | :--- |
| 1 | Goal: destroy the enemy crystal, protect yours | Click each labelled board (Protect / Destroy) → both pulse |
| 2 | Units sit on your board; they only hit crystals | **Drag** the recruit card onto the highlighted tile |
| 3 | Damage | **Sandbox**: cast damage → shield then life drop live |
| 4 | Shield | **Sandbox**: cast shield, then damage → shield absorbs |
| 5 | Heal | **Sandbox**: poison, then heal → life up, poison removed |
| 6 | Regen | **Sandbox**: cast regen, watch it tick life up each second |
| 7 | Poison | **Sandbox**: cast poison → life drops *through* the shield |
| 8 | Advanced abilities | **Sandbox** with haste / slow / charge / power / crit chips |
| 9 | Reactions happen after actions, never chain | Click "ally casts Shield" → reaction fires, +power pops |
| 10 | Example unit: thunder_conduit | **Inspector**: tap each effect row to play it |
| 11 | Positional reactions (same column) | **Inspector** |
| 12 | Row trigger → column effect | **Inspector** |
| 13 | Reacting to enemy actions | **Inspector** |
| 14 | Wrap-up | Free play (no gate) |

## 4. Sandbox rules (pure, `core/src/content/tutorialSandbox.ts`)

Mirrors the combat engine's observable behaviour exactly, so nothing taught in
the tutorial contradicts a real fight:

- **Damage** → shield absorbs first, remainder hits life
  (`Force.applyDamageToForce`).
- **Poison** → bypasses shield entirely and additionally adds a per-second
  status rate (`PoisonDamageSystem`).
- **Heal** → restores life, capped at max, and removes `floor(heal * 0.05)`
  poison (20 heal per 1 poison — the number the slide text quotes).
- **Regen** → adds a per-second heal rate; each `tick()` applies it.
- **Haste / slow / charge / power / crit** → annotate the state
  (`cooldownMultiplier`, `powerBonus`, `critChance`) without an instant number,
  so the palette can still show a real effect.

## 5. Entry points

- **First launch**: `title` shows a one-button offer ("New here? Play the
  tutorial") backed by `tutorialStore` (`mana-game-tutorial` in the storage
  provider). Seen once → never auto-offered again.
- **Menu**: a permanent `tutorialButton` on the title main menu.
- **Reset-safe**: the store is written on exit, so quitting mid-tutorial
  re-offers it next launch and resumes at the furthest completed slide.
- The old slideshow stays reachable as the mechanics reference (the existing
  `howToPlay` hotspot).

## 6. Implementation notes (gotchas found the hard way)

Two client-side traps cost real debugging time here; both are documented so the
next tutorial/slide-like feature avoids them.

### Phaser `TimerEvent` does not keep real time

`scene.time.addEvent({ delay: 1200 })` advances with `Clock`, whose `timeScale`
the client sets from the player's **game speed** option
(`OptionsStore.setGameSpeed`). On a slow setting a "1 second" status tick took
several real seconds, which made the regen/poison lessons look broken.

A tutorial is not gameplay, so `Tutorial/tutorialScheduler.ts` counts real
milliseconds off `scene.events.UPDATE` instead. Two rules it encodes:

- the update subscription lasts for the scheduler's whole lifetime — only
  `destroy()` removes it. `cancelAll()` deliberately keeps it, because every
  cast clears the previous status counter and arms a new one; an unsubscribe on
  `cancelAll()` left the fresh counter silently dead (the actual bug behind
  "regen never ticks").
- a throwing callback is caught and logged. Phaser swallows throws at the
  emitter boundary, which silently stops every later tick while the game still
  looks alive.

### The dev server could serve stale modules

`webpack/config.dev.cjs` used a filesystem cache (`.webpack-cache/dev`) that
survived across runs. When the watcher missed a change the browser ran an older
module than the source on screen — edits appeared to have no effect. The dev
config now uses `cache: { type: "memory" }`, so a dev-server start always
builds from source.

### Layout is guarded by a test

Demo units are positioned in **screen pixels** (`TutorialDemoUnit.screen`) on the
panel slides, because board cells collide with the palette and the readout. A
core test (`tutorialSlides.test.ts`) reserves the palette / readout / inspector
/ Next-button regions and fails if any authored unit overlaps them — the first
version of the sandbox had the caster standing on top of the ability chips.

## 7. Testing

- `core`: gate evaluation over the authored slides (every interactive slide
  declares a reachable gate; every `require` id exists), plus the sandbox
  rules (shield absorption, poison piercing, heal/poison interaction, regen
  ticks, ability lookup).
- `phaser`: slide-progress bookkeeping (gate opens exactly when its condition
  is met, resets on slide change).

Runtime coverage (manual, via `__debug.tutorial`): all 14 slides were driven
end-to-end in a headless browser — 14/14 gates reached 100% with no console
errors. `__debug.tutorial` exposes `slide()`, `gateSatisfied()`,
`completion()`, `next()`, `previous()` and `close()`, each next/previous going
through the real gate check, so the (currently broken) Playwright suite can
drive the tutorial without depending on slide pixel positions.
