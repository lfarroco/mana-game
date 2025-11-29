import { storage } from "../../Storage";

export const getSavedData = () => storage.getItem("gameData");
