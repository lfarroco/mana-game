import { DebugController } from '../src/Scenes/Debug/DebugController';

declare global {
	interface Window {
		//game: Phaser.Game; // already declared in main project, kept here for reference
		gameController: DebugController;
	}
}
