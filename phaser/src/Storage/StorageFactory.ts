import { StorageProvider } from "./IStorageProvider";
import { createLocalStorageProvider } from "./LocalStorageProvider";
import { createSteamCloudProvider } from "./SteamCloudProvider";

const isElectron = (): boolean => {
	return (
		typeof window !== "undefined" &&
		typeof window.process === "object" &&
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window.process as any)?.type === "renderer"
	);
};


const isSteamAvailable = (): boolean => {

	return false;
};

export const createStorageProvider = (): StorageProvider => {
	if (isElectron() && isSteamAvailable()) {
		console.log("[StorageFactory] Using Steam Cloud storage provider");
		return createSteamCloudProvider();
	}

	console.log("[StorageFactory] Using localStorage storage provider");
	return createLocalStorageProvider();
};
