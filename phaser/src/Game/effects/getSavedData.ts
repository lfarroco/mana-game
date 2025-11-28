import { storage } from "../../Storage";
export const getSavedData = async () => await storage.getItem("gameData");
