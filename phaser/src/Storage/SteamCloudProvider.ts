import { StorageProvider } from "./IStorageProvider";

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
		console.warn("[SteamCloudProvider] Steam API not available");
	}

	return {
		getItem: (key: string): string | null => {
			if (!steam) {
				console.warn(`[SteamCloudProvider] Steam not initialized. Cannot get "${key}".`);
				return null;
			}

			try {
				// Check if file exists first
				if (!steam.cloud.fileExists(key)) {
					console.log(`[SteamCloudProvider] File "${key}" not found in Steam Cloud`);
					return null;
				}

				const data = steam.cloud.readFile(key);
				console.log(`[SteamCloudProvider] Successfully read "${key}" from Steam Cloud`);
				return data;
			} catch (error) {
				console.error(`[SteamCloudProvider] Error reading "${key}":`, error);
				return null;
			}
		},

		setItem: (key: string, value: string): void => {
			if (!steam) {
				console.warn(`[SteamCloudProvider] Steam not initialized. Cannot set "${key}".`);
				return;
			}

			try {
				const success = steam.cloud.writeFile(key, value);
				if (success) {
					console.log(`[SteamCloudProvider] Successfully wrote "${key}" to Steam Cloud`);
				} else {
					console.error(`[SteamCloudProvider] Failed to write "${key}" to Steam Cloud`);
				}
			} catch (error) {
				console.error(`[SteamCloudProvider] Error writing "${key}":`, error);
			}
		},

		removeItem: (key: string): void => {
			if (!steam) {
				console.warn(`[SteamCloudProvider] Steam not initialized. Cannot remove "${key}".`);
				return;
			}

			try {
				const success = steam.cloud.deleteFile(key);
				if (success) {
					console.log(`[SteamCloudProvider] Successfully deleted "${key}" from Steam Cloud`);
				} else {
					console.warn(`[SteamCloudProvider] File "${key}" not found or failed to delete`);
				}
			} catch (error) {
				console.error(`[SteamCloudProvider] Error deleting "${key}":`, error);
			}
		},
	};
};

