import { initGame } from "./initGame";
import * as OptionsStore from "./Models/OptionsStore";

export const game = initGame();

OptionsStore.init()
