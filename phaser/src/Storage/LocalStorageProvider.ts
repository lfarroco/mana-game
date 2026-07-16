import { StorageProvider } from "./IStorageProvider";
import * as Logger from "@Utils/Logger";


export const createLocalStorageProvider = (): StorageProvider => ({
	getItem: (key: string): string | null => {
		try {
			return localStorage.getItem(key);
		} catch (error) {
			Logger.warn("LocalStorageProvider", `[LocalStorageProvider] Failed to get item "${key}":`, error);
			return null;
		}
	},

	setItem: (key: string, value: string): void => {
		try {
			localStorage.setItem(key, value);
		} catch (error) {
			Logger.warn("LocalStorageProvider", `[LocalStorageProvider] Failed to set item "${key}":`, error);
		}
	},

	removeItem: (key: string): void => {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			Logger.warn("LocalStorageProvider", `[LocalStorageProvider] Failed to remove item "${key}":`, error);
		}
	},
});
