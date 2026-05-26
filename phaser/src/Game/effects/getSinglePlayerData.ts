
export const getSinglePlayerData = () => {
	const sessionStr = localStorage.getItem('mana_session_local-player');
	if (sessionStr) {
		return sessionStr;
	}

	return null;
};
