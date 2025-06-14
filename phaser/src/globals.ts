import { DebugController } from "./Scenes/Debug/DebugController";

declare global {
	interface Window {
		game: Phaser.Game;
		gameController: DebugController;
	}
}
