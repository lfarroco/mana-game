import { LOCAL_PLAYER_ID, getSession } from "../../SessionManager";

export const getSinglePlayerData = () => getSession(LOCAL_PLAYER_ID);
