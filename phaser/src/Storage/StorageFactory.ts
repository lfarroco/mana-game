import { StorageProvider } from "./IStorageProvider";
import { createLocalStorageProvider } from "./LocalStorageProvider";
import { createSteamCloudProvider } from "./SteamCloudProvider";
import { createLogger } from "@Utils/Logger";

const logger = createLogger("StorageFactory");

const isElectron = (): boolean => {
	return (
		typeof window !== "undefined" &&
		typeof window.process === "object" &&
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window.process as any)?.type === "renderer"
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
		logger.warn("[StorageFactory] Error checking Steam availability:", error);
		return false;
	}
};

export const createStorageProvider = (): StorageProvider => {
	if (isElectron() && isSteamAvailable()) {
		logger.debug("[StorageFactory] Using Steam Cloud storage provider");
		return createSteamCloudProvider();
	}

	logger.debug("[StorageFactory] Using localStorage storage provider");
	return createLocalStorageProvider();
};
