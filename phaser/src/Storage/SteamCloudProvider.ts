import { StorageProvider } from "./IStorageProvider";

declare const window: Window & {
	greenworks?: {
		cloud: {
			isCloudEnabled(): boolean;
			readTextFromFile(fileName: string, success: (content: string) => void, error: (err: any) => void): void;
			saveTextToFile(fileName: string, content: string, success: () => void, error: (err: any) => void): void;
			deleteFile?(fileName: string, success: () => void, error: (err: any) => void): void;
		};
		achievement: {
			activate(achievementId: string, success: () => void, error: (err: any) => void): void;
		};
		init(): boolean;
	};
};

export const createSteamCloudProvider = (): StorageProvider => {
	// Check if greenworks is available (initialized by Electron main process)
	const steam = window.greenworks;

	if (!steam) {
		console.warn("[SteamCloudProvider] Steam API not available");
	}

	return {
		getItem: (key: string): Promise<string | null> => {
			if (!steam) {
				console.warn(`[SteamCloudProvider] Steam not initialized. Cannot get "${key}".`);
				return Promise.resolve(null);
			}

			return new Promise((resolve) => {
				steam.cloud.readTextFromFile(
					key,
					(content: string) => {
						console.log(`[SteamCloudProvider] Successfully read "${key}" from Steam Cloud`);
						resolve(content);
					},
					(err: any) => {
						console.log(`[SteamCloudProvider] File "${key}" not found or error:`, err);
						resolve(null);
					}
				);
			});
		},

		setItem: (key: string, value: string): Promise<void> => {
			if (!steam) {
				console.warn(`[SteamCloudProvider] Steam not initialized. Cannot set "${key}".`);
				return Promise.resolve();
			}

			return new Promise((resolve) => {
				steam.cloud.saveTextToFile(
					key,
					value,
					() => {
						console.log(`[SteamCloudProvider] Successfully wrote "${key}" to Steam Cloud`);
						resolve();
					},
					(err: any) => {
						console.error(`[SteamCloudProvider] Failed to write "${key}" to Steam Cloud:`, err);
						resolve();
					}
				);
			});
		},

		removeItem: (key: string): Promise<void> => {
			// Greenworks might not support deleteFile directly or it might be different.
			// We'll try to use it if available, otherwise just log.
			if (!steam) {
				return Promise.resolve();
			}

			// Check if deleteFile exists
			if (typeof steam.cloud.deleteFile === 'function') {
				return new Promise((resolve) => {
					// @ts-ignore
					steam.cloud.deleteFile(key, () => {
						console.log(`[SteamCloudProvider] Successfully deleted "${key}"`);
						resolve();
					}, (err: any) => {
						console.warn(`[SteamCloudProvider] Failed to delete "${key}":`, err);
						resolve();
					});
				});
			}

			console.warn(`[SteamCloudProvider] deleteFile not supported by greenworks version`);
			return Promise.resolve();
		},
	};
};

