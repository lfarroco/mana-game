import * as io from "@PhaserIO";

const BATTLEGROUND_EXIT_EVENT = "battleground:exit";

export const onBattlegroundExit = (callback: () => void) => {
	io.scene.events.on(BATTLEGROUND_EXIT_EVENT, callback);

	return () => {
		io.scene.events.off(BATTLEGROUND_EXIT_EVENT, callback);
	};
};

export const emitBattlegroundExit = () => {
	io.scene.events.emit(BATTLEGROUND_EXIT_EVENT);
};

const transitionFromBattleground = async (renderScreen: () => void) => {
	emitBattlegroundExit();
	await io.FadeOut(300, 0x000000);
	io.clean();
	renderScreen();
	await io.FadeIn(300);
};

export const returnToMainMenu = async () => {
	await transitionFromBattleground(() => {
		io.screens.title();
	});
};

export const startNewRun = async () => {
	await transitionFromBattleground(() => {
		io.screens.crystalSelection(false);
	});
};