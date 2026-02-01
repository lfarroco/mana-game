import { storage } from "../../Storage";

export const getSavedData = () => {
	// 1. First attempt to load modern session data from LocalStorage
	// Since SessionManager persists to localStorage with 'mana_session_', we should check that first.
	// However, loadGame() expects a return value compatible with either raw gameData or SessionData.

	// Assuming single player for now, iterate through storage to find active mana_session_
	// This is a bit hacky, but consistent with SessionManager implementation
	if (typeof localStorage !== 'undefined') {
		const STORAGE_PREFIX = 'mana_session_';
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(STORAGE_PREFIX)) {
				// Return the most recent session found
				const sessionStr = localStorage.getItem(key);
				if (sessionStr) {
					return sessionStr;
				}
			}
		}
	}

	// 2. Fallback to legacy "gameData"
	return storage.getItem("gameData");
};
