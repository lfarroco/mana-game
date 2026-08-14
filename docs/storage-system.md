# Storage System

The **Storage System** handles persistent data (like player progress and settings) with support for both local browser storage and Steam Cloud saves.

## Architecture

The system uses a **Provider Pattern** to abstract the underlying storage mechanism. All storage operations go through the `StorageProvider` interface.

### Interface: `IStorageProvider`

Located in `phaser/src/Systems/Storage/IStorageProvider.ts`.

```typescript
export type StorageProvider = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
};
```

## Storage Factory

The `StorageFactory` (`phaser/src/Systems/Storage/StorageFactory.ts`) is responsible for instantiating the correct provider at runtime.

It performs the following checks:
1.  **Is Electron?** Checks if the app is running in an Electron renderer process.
2.  **Is Steam Available?** Checks if the `steamworks` object is exposed on the `window` and if Steam Cloud is enabled for the app.

- If **BOTH** are true -> Returns `SteamCloudProvider`.
- Otherwise -> Returns `LocalStorageProvider`.

## Providers

### Steam Cloud Provider
*   **File:** `phaser/src/Systems/Storage/SteamCloudProvider.ts`
*   **Usage:** Used when running the game on Steam via Electron.
*   **Mechanism:** Calls the exposed `window.steamworks.cloud` API to read/write files directly to Steam Cloud.
*   **Notes:** Error handling is included to catch cases where Steam might be uninitialized.

### Local Storage Provider
*   **File:** `phaser/src/Systems/Storage/LocalStorageProvider.ts`
*   **Usage:** Used for web builds or when Steam is unavailable.
*   **Mechanism:** Wraps the standard browser `window.localStorage` API.

## Barrel & helpers

- `phaser/src/Systems/Storage/index.ts` — exports `storage` (the app-wide
  provider instance created by `StorageFactory`).
- `phaser/src/Systems/Storage/loadGame.ts`, `getSinglePlayerData.ts`,
  `deleteSavedData.ts` — save-file load/delete helpers used by the screens.

## Usage Example

```typescript
import { storage } from "@Systems/Storage";

// Save data
storage.setItem("player_save", JSON.stringify(saveData));

// Load data
const data = storage.getItem("player_save");
```
