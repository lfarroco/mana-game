import { StorageProvider } from "./IStorageProvider";
import * as Logger from "@Utils/Logger";


// Declare steamworks types for TypeScript
declare const window: Window & {
	steamworks?: {
		cloud: {
			isEnabledForApp(): boolean;
			isEnabledForAccount(): boolean;
			readFile(fileName: string): string;
			writeFile(fileName: string, content: string): boolean;
			deleteFile(fileName: string): boolean;
			fileExists(fileName: string): boolean;
		};
	};
};

export const createSteamCloudProvider = (): StorageProvider => {
	// Check if steamworks is available (initialized by Electron main process)
	const steam = window.steamworks;

	if (!steam) {
		Logger.warn("SteamCloudProvider", "[SteamCloudProvider] Steam API not available");
	}

	return {
		getItem: (key: string): string | null => {
			if (!steam) {
				Logger.warn("SteamCloudProvider", `[SteamCloudProvider] Steam not initialized. Cannot get "${key}".`);
				return null;
			}

			try {
				// Check if file exists first
				if (!steam.cloud.fileExists(key)) {
					Logger.debug("SteamCloudProvider", `[SteamCloudProvider] File "${key}" not found in Steam Cloud`);
					return null;
				}

				const data = steam.cloud.readFile(key);
				Logger.debug("SteamCloudProvider", `[SteamCloudProvider] Successfully read "${key}" from Steam Cloud`);
				return data;
			} catch (error) {
				Logger.error("SteamCloudProvider", `[SteamCloudProvider] Error reading "${key}":`, error);
				return null;
			}
		},

		setItem: (key: string, value: string): void => {
			if (!steam) {
				Logger.warn("SteamCloudProvider", `[SteamCloudProvider] Steam not initialized. Cannot set "${key}".`);
				return;
			}

			try {
				const success = steam.cloud.writeFile(key, value);
				if (success) {
					Logger.debug("SteamCloudProvider", `[SteamCloudProvider] Successfully wrote "${key}" to Steam Cloud`);
				} else {
					Logger.error("SteamCloudProvider", `[SteamCloudProvider] Failed to write "${key}" to Steam Cloud`);
				}
			} catch (error) {
				Logger.error("SteamCloudProvider", `[SteamCloudProvider] Error writing "${key}":`, error);
			}
		},

		removeItem: (key: string): void => {
			if (!steam) {
				Logger.warn("SteamCloudProvider", `[SteamCloudProvider] Steam not initialized. Cannot remove "${key}".`);
				return;
			}

			try {
				const success = steam.cloud.deleteFile(key);
				if (success) {
					Logger.debug("SteamCloudProvider", `[SteamCloudProvider] Successfully deleted "${key}" from Steam Cloud`);
				} else {
					Logger.warn("SteamCloudProvider", `[SteamCloudProvider] File "${key}" not found or failed to delete`);
				}
			} catch (error) {
				Logger.error("SteamCloudProvider", `[SteamCloudProvider] Error deleting "${key}":`, error);
			}
		},
	};
};
