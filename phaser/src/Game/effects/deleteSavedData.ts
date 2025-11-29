import { storage } from "../../Storage";

export const deleteSavedData = () => {
	storage.removeItem("gameData");
	console.log("[deleteSavedData] Saved game data deleted");
};
