# Localization System

The **Localization System** (i18n) allows the game to support multiple
languages: loading translation files, switching locales, and persisting the
user preference.

## Architecture

The **pure engine lives in `core/`**; `phaser/` owns the catalogs, locale
state, and persistence.

- **Engine — `core/src/i18n/translator.ts`**: `createTranslator(locales, getCurrentLocale, defaultLocale)`
  returns a `Translator` (`t(key, params?)`, `getName`, `getAvailableLocales`).
  `DEFAULT_LOCALE = "en"`, `LOCALE_NATIVE_NAMES` for display names. Fallback:
  missing key → `en`; missing in `en` → the key itself.
- **Catalogs — `phaser/src/i18n/*.json`**: `en`, `es`, `pt`, `jp`, `cn`, `ru`.
- **Wiring / persistence — `phaser/src/i18n/i18n.ts`**: imports the JSON
  catalogs, owns `currentLocale`, persists the choice under `selected_locale`
  in `localStorage`, and builds the module-level `Translator` via
  `createTranslator`. Re-exports `t`, `getName`, `getAvailableLocales`,
  `setLocale`, `getCurrentLocale`, `getNativeName`.

## Supported Languages

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
import { t } from "@i18n/i18n";

// Simple key
const title = t("main_menu.start_game");

// With parameters
const message = t("battle.damage_dealt", { amount: "50", unit: "Warrior" });
// JSON: "battle.damage_dealt": "{unit} dealt {amount} damage!"
```

### Changing Language

Use `setLocale` to switch the active language. This persists the choice and
emits `GameEvent.localeChanged`.

```typescript
import { setLocale } from "@i18n/i18n";

setLocale("jp");
```

## Adding a New Language

1. Create a new JSON file in `phaser/src/i18n` (e.g., `fr.json`).
2. Import it in `phaser/src/i18n/i18n.ts` and add it to the `locales` record.
3. Add the native name to `LOCALE_NATIVE_NAMES` in
   `core/src/i18n/translator.ts`.

```typescript
// i18n.ts
import fr from "./fr.json";

const locales = {
    // ...
    fr
};
```

## Fallback Logic

If a key is missing in the current language, the system falls back to
**English** (`en`). If the key is missing in English, it returns the key itself.
