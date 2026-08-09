import { StorageProvider } from "./IStorageProvider";
import { createLocalStorageProvider } from "./LocalStorageProvider";
import { createSteamCloudProvider } from "./SteamCloudProvider";
const isElectron = (): boolean => {
	return (
		typeof window !== "undefined" &&
		typeof (window as unknown as Record<string, unknown>).process === "object" &&
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		((window as unknown as Record<string, unknown>).process as any)?.type === "renderer"
	);
};

const isSteamAvailable = (): boolean => {
	try {
		// Check if window.steamworks is available (set by Electron preload/main)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const steamworks = (window as any).steamworks;

		if (!steamworks || !steamworks.cloud) {
			return false;
		}

		// Check if Steam Cloud is enabled for the app
		return steamworks.cloud.isEnabledForApp();
	} catch (error) {
		console.warn("StorageFactory", "[StorageFactory] Error checking Steam availability:", error);
		return false;
	}
};

export const createStorageProvider = (): StorageProvider => {
	if (isElectron() && isSteamAvailable()) {
		console.debug("StorageFactory", "[StorageFactory] Using Steam Cloud storage provider");
		return createSteamCloudProvider();
	}

	console.debug("StorageFactory", "[StorageFactory] Using localStorage storage provider");
	return createLocalStorageProvider();
};
