
import { STORAGE_PREFIX, LOCAL_PLAYER_ID } from "../../SessionManager";

export const getSinglePlayerData = () => {
	const sessionStr = localStorage.getItem(STORAGE_PREFIX + LOCAL_PLAYER_ID);
	if (sessionStr) {
		return sessionStr;
	}

	return null;
};
