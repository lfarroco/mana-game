import { State } from "./Models/State";
import { DebugController } from "./Scenes/Debug/DebugController";

declare global {
	interface Window {
		game: Phaser.Game;
		state: State;
		gameController: DebugController;
	}
}
