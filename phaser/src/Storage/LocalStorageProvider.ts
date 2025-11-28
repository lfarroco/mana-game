import { StorageProvider } from "./IStorageProvider";

export const createLocalStorageProvider = (): StorageProvider => ({
	getItem: (key: string): Promise<string | null> => {
		try {
			return Promise.resolve(localStorage.getItem(key));
		} catch (error) {
			console.warn(`[LocalStorageProvider] Failed to get item "${key}":`, error);
			return Promise.resolve(null);
		}
	},

	setItem: (key: string, value: string): Promise<void> => {
		try {
			localStorage.setItem(key, value);
			return Promise.resolve();
		} catch (error) {
			console.warn(`[LocalStorageProvider] Failed to set item "${key}":`, error);
			return Promise.resolve();
		}
	},

	removeItem: (key: string): Promise<void> => {
		try {
			localStorage.removeItem(key);
			return Promise.resolve();
		} catch (error) {
			console.warn(`[LocalStorageProvider] Failed to remove item "${key}":`, error);
			return Promise.resolve();
		}
	},
});
