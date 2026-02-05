const STORAGE_PREFIX = 'mana_session_';

/**
 * Get saved session data from localStorage.
 * Returns the first session found with the 'mana_session_' prefix.
 */
export const getSavedData = () => {
	if (typeof localStorage !== 'undefined') {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(STORAGE_PREFIX)) {
				const sessionStr = localStorage.getItem(key);
				if (sessionStr) {
					return sessionStr;
				}
			}
		}
	}

	return null;
};
