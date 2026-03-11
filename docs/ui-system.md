# UI System

The UI layer in Mana Battle is built on top of Phaser game objects with composition-focused helper modules.

The system favors small functional builders that create containers, text, graphics, and interactions, then compose those pieces per scene.

## High-Level Structure

Main UI entry points:

- `phaser/src/UI/UI.ts`
- `phaser/src/UI/events.ts`
- `phaser/src/UI/components/`
- Shared primitives in `phaser/src/Components/`

### Responsibilities

- `UI.ts`: creates and destroys the top HUD container and handles transient user messages.
- `events.ts`: updates UI state when game state changes (wins, lives, round, purchase errors).
- `UI/components/*`: concrete HUD elements (header background, round, lives, wins, menu).
- `Components/*`: reusable widgets (button, slider, tooltip, modal, panel, overlays).

## Composition Pattern

UI builders return Phaser game objects and are composed into containers:

1. A feature module exports a `create()` function.
2. `UI.init(state)` composes those creators into container hierarchies.
3. Event handlers call update functions on specific modules.

This avoids monolithic scene classes and keeps each widget mostly independent.

## Core HUD Elements

### Header Container

Created in `UI.init()` as a container containing:

- Header background polygon (`components/headerBackground.ts`)
- Round label/value (`components/roundDisplay.ts`)
- Lives hearts (`components/livesDisplay.ts`)
- Wins progress bar (`components/winsDisplay.ts`)

### Menu Button + Panel

`components/menuButton.ts` renders a button that opens a modal-like panel with scene actions:

- New run (feature-flagged via game controller)
- Return to main menu
- Back/close

## Event-Driven Updates

`UI/events.ts` maps domain events to visual updates:

- `onWinsChanged(newTotalWins, winsDelta)`
- `onLivesChanged(newTotalLives, livesDelta)`
- `onRoundChanged(newRound)`
- `onPurchaseFailed(unitName, reason, cost?)`

Animations are localized to their owning component (for example, lives delta text and win effects).

## Layout Management

Layout is currently constant-based and manually positioned with helper methods (`SetPosition`, `Centralize`, container offsets).

Patterns used throughout:

- Scene-level anchor constants for major blocks.
- Component-level local offsets inside containers.
- Predefined panel sizes for overlays/menu panels.

This is simple and explicit, but changes to global resolution/layout require touching component constants.

## Shared UI Components

Reusable primitives in `phaser/src/Components/` include:

- `UIButton.ts`: stylized interactive button with shader overlay, hover/press behavior, and optional debug trigger registry.
- `Slider.ts`: neon-style slider with drag/hover interactions and snapped values.
- `Tooltip.ts`: dynamic shader-backed tooltip with BBCode text, clamped positioning, and top-layer rendering.
- `Modal.ts`: overlay + panel wrapper with animated open/close behavior.
- `Panel.ts`, `BackgroundOverlay.ts`, and additional visual helpers.

## Input Handling

Input uses Phaser interactive objects and pointer events:

- `pointerover` / `pointerout` for hover states and tooltips.
- `pointerdown` / `pointerup` for button and slider interaction.
- Full-screen interactive rectangle overlays for modal/menu focus capture.

Audio feedback for UI actions is triggered at widget level (for example in `UIButton` and `Slider`).

## Localization

All UI text should use `t(...)` keys from `phaser/src/i18n/`.

Most core UI modules already follow this pattern (menu labels, shop error text, tooltip titles/descriptions, round/lives/wins labels).

## Extension Guidelines

When adding a new UI element:

1. Create a focused module under `UI/components/` when feature-specific, or `Components/` when reusable.
2. Keep rendering logic and update logic in the same module when practical.
3. Expose `create()` and minimal update functions instead of mutable internals.
4. Use localization keys for all user-visible text.
5. Add cleanup paths for containers/tooltips/listeners to avoid stale objects between scene transitions.

## Known Gaps

- No centralized responsive layout engine; positioning is mostly fixed constants.
- Some UI primitives still log debug messages directly (`UIButton`), which should eventually align with structured logging.
- `OptionsStore.debug` setting exists but has limited direct UI/runtime wiring.
