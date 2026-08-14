# Options / Preferences System

The Options system stores player preferences, renders the Options menu UI, and applies side effects such as volume and game speed updates.

## Overview

Primary implementation areas:

- `core/src/settings/playerSettings.ts` — the `PlayerSettings` type + `defaultSettings()`
- `core/src/settings/options.ts` — `parseStoredOptions()` (validation of persisted JSON)
- `phaser/src/Models/ClientState.ts` — re-exports `defaultSettings` / `PlayerSettings` from core into `env.state.settings`
- `phaser/src/Models/OptionsStore.ts` — thin Phaser-side wrapper: module-scoped state, runtime side effects, persistence
- `phaser/src/Screens/Options/` (OptionsScreen + tab controls)
- `phaser/src/Systems/AudioManager.ts` (reacts to audio preference changes)

At startup (`phaser/src/main.ts`), `OptionsStore.init()` loads persisted settings and applies runtime effects.

## Data Model

`OptionsStore` keeps a single module-scoped `PlayerSettings` object (type
defined in `core/src/settings/playerSettings.ts`) with these fields:

- `sound: boolean`
- `soundVolume: number` (0-1)
- `music: boolean`
- `musicVolume: number` (0-1)
- `masterVolume: number` (0-1)
- `debug: boolean`
- `speed: number` (clamped to `>= 0` when applied)
- `particles: "low" | "medium" | "high"`
- `compactTooltips: boolean`

The public API is intentionally small:

- `init()`
- `getOptions()`
- `getOption(key, default?)`
- `setOption(key, value)`
- `saveOptions()`

## Persistence

Options are stored under the key `mana-game-options`.

Persistence path:

1. `OptionsStore` uses `storage` from `phaser/src/Systems/Storage/index.ts`.
2. `storage` is produced by `StorageFactory`.
3. In Electron + Steam Cloud environments, Steam Cloud provider is used.
4. Otherwise, browser `localStorage` provider is used.

On boot (`OptionsStore.init()`), `OptionsStore` first checks whether the
`mana-game-options` namespace exists in storage. If it does not (first launch),
the namespace is created with the defaults from `defaultSettings()`
(`core/src/settings/playerSettings.ts`, re-exported by `ClientState`) so the
persisted settings always exist and are read back consistently.

On read, `parseStoredOptions()` (`core/src/settings/options.ts`) validates
types/ranges before merging values into current options, so malformed saved
data is ignored safely.

## Runtime Side Effects

`setOption()` triggers immediate side effects for specific keys:

- `sound`, `music`, `soundVolume`, `musicVolume`:
  calls `AudioManager.onOptionsChanged()`
- `masterVolume`:
  updates `game.sound.volume`
- `speed`:
  updates each active scene's `time.timeScale` and `tweens.timeScale`

This keeps preferences as the single source of truth while still updating live gameplay systems.

## Options Scene UI

The Options screen has three tabs:

- `audio`
- `graphics`
- `game`

Tab composition is done in `showTab()`:

- Audio tab (`Components/tabs/audio.ts`):
  master volume, sound toggle, sound volume, music toggle, music volume
- Graphics tab (`Components/tabs/graphics.ts`):
  particle quality (`low/medium/high`) and immediate background update
- Game tab (`Components/tabs/game.ts`):
  debug toggle, speed slider, compact tooltips toggle

Controls are functional builders (`boolean`, `volume`, `speed`, `multipleChoice`) that receive `getValue`/`setValue` closures and return Phaser objects.

## Localization

All user-facing labels are pulled through `t(...)` keys from the i18n system —
engine in `core/src/i18n/translator.ts`, catalogs in `phaser/src/i18n/*.json`.

When adding new options:

1. Add the field to `PlayerSettings` + `defaultSettings()` in
   `core/src/settings/playerSettings.ts` and its validation in
   `parseStoredOptions()` (`core/src/settings/options.ts`).
2. Wire the UI in `Screens/Options/Components/tabs/`.
3. Add localization keys for all supported locales.
4. Add any required runtime side effect in `setOption()`.

## Known Notes

- `debug` is persisted and exposed in UI, but currently has limited runtime integration.
- `saveOptions()` exists for explicit save calls, but normal UI interaction persists automatically via `setOption()`.
