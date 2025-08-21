import { initGame } from "./initGame";
import * as OptionsStore from "./Models/OptionsStore";
import * as DebugController from "./Scenes/Debug/DebugController";

export const game = initGame();

OptionsStore.init()

if (process.env.NODE_ENV === 'development') {
	window.debugController = DebugController;
}
