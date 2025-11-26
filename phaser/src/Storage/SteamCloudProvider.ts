import { StorageProvider } from "./IStorageProvider";

export const createSteamCloudProvider = (): StorageProvider => ({
	getItem: (key: string): string | null => {
		console.warn(
			`[SteamCloudProvider] Not implemented yet. Attempted to get "${key}". Returning null.`
		);
		return null;
	},

	setItem: (_key: string, _value: string): void => {
		console.warn(
			`[SteamCloudProvider] Not implemented yet. Attempted to set "${_key}". No action taken.`
		);
	},

	removeItem: (_key: string): void => {
		console.warn(
			`[SteamCloudProvider] Not implemented yet. Attempted to remove "${_key}". No action taken.`
		);
	},
});
