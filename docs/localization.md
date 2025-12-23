# Localization System

The **Localization System** (i18n) allows the game to support multiple languages. It handles loading translation files, switching locales, and persisting user preferences.

## Architecture

*   **Source:** `phaser/src/i18n`
*   **Format:** JSON files (key-value pairs).
*   **Storage:** User preference is saved in `localStorage` with the key `selected_locale`.

## Supported Languages

The system currently supports:
*   **English** (`en`) - Default / Fallback
*   **Spanish** (`es`)
*   **Portuguese** (`pt`)
*   **Japanese** (`jp`)
*   **Chinese** (`cn`)
*   **Russian** (`ru`)

## Usage

### Getting a Translation
Use the `t` function to retrieve a translated string.

```typescript
import { t } from "../i18n/i18n";

// Simple key
const title = t("main_menu.start_game");

// With parameters
const message = t("battle.damage_dealt", { amount: "50", unit: "Warrior" });
// JSON: "battle.damage_dealt": "{unit} dealt {amount} damage!"
```

### Changing Language
Use `setLocale` to switch the active language. This automatically persists the choice.

```typescript
import { setLocale } from "../i18n/i18n";

setLocale("jp");
```

## Adding a New Language

1.  Create a new JSON file in `phaser/src/i18n` (e.g., `fr.json`).
2.  Import the file in `phaser/src/i18n/i18n.ts`.
3.  Add it to the `locales` object.
4.  Add the native name to `localeNames`.

```typescript
// i18n.ts
import fr from './fr.json';

const locales = {
    // ...
    fr
};

const localeNames = {
    // ...
    fr: "Français"
};
```

## Fallback Logic

If a key is missing in the current language, the system falls back to **English** (`en`). If the key is missing in English, it returns the key itself.
