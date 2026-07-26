# UI System

The UI layer is built on Phaser game objects with small functional builders
composed per screen.

## Structure

- **Shared, reusable widgets**: `phaser/src/Components/` — `Button/`,
  `Slider/`, `Tooltip/`, `Modal/`, `Panel/`, `Overlay/`, `Chip/`,
  `MagicOrb/`, `EnergySlot/`, `CloudsBackground/`, `Board/`.
- **Battleground HUD**: `phaser/src/Screens/Battleground/Components/UI/` —
  `UI.ts` (top HUD container + transient messages), `events.ts` (wins /
  lives / round / purchase-error updates), `headerBackground.ts`,
  `roundDisplay.ts`, `livesDisplay.ts`, `winsDisplay.ts`, `namesDisplay.ts`,
  `RunStatsPanel.ts`, `theme.ts`.
- Other screens keep their UI in `Screens/<Screen>/Components/` (e.g.
  `Screens/Options/Components/`).
- Battleground composition root: `Screens/Battleground/Components.ts`
  (creates Background, Board, UI, Shop, ResultsUI, DiscardZone);
  `Components/menuButton.ts` opens the in-game menu panel.

## Composition pattern

1. A feature module exports a `create()` function returning Phaser objects.
2. Screens compose those creators into container hierarchies inside their
   own `create()`.
3. Event handlers call update functions on specific modules.

This keeps widgets independent and avoids monolithic scene classes.

## Event-driven updates

`Components/UI/events.ts` maps domain events to visual updates:

- `onWinsChanged(newTotalWins, winsDelta)`
- `onLivesChanged(newTotalLives, livesDelta)`
- `onRoundChanged(newRound)`
- `onPurchaseFailed(unitName, reason, cost?)`

## Layout

Constant-based, manual positioning (anchor constants + local offsets inside
containers). There is no responsive layout engine — resolution changes
require touching component constants.

## Input

Phaser interactive objects: `pointerover` / `pointerout` for hover states and
tooltips, `pointerdown` / `pointerup` for buttons and sliders, full-screen
overlays for modal focus capture. Audio feedback is triggered at the widget
level.

## Localization

All UI text uses `t(...)` keys from `phaser/src/i18n/` (see
[localization.md](localization.md)).

## Extension guidelines

1. Feature-specific module under the screen's `Components/`; reusable widget
   under `phaser/src/Components/`.
2. Expose `create()` and minimal update functions; keep rendering and update
   logic together.
3. Use localization keys for all user-visible text.
4. Add cleanup paths (destroy containers, dispose listeners) — screens are
   re-created on each visit.

## Known gaps

- No centralized responsive layout engine.
- `OptionsStore.debug` exists but has limited runtime wiring.
