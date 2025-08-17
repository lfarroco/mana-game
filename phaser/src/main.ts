import { initGame } from "./initGame";
import { initializeOptionsStore } from "./Models/OptionsStore";

export const game = initGame();

initializeOptionsStore(game);
