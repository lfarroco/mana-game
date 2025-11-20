import { getState } from "@Models/State";
import * as ControlsSystem from "@Systems/Controls";
import * as Board from "@Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { scene } from "../BattlegroundScene";
import { getOption } from "@Models/OptionsStore";
import { CloudsBackground } from "../../../Components/cloudBackground/CloudsBackground";
import { initBlackHole } from "../BlackHole";

export let cloudsBackground: CloudsBackground | null = null;

export function initializeNewGame(): void {
	const state = getState();

	state.gameData.player.units = [];
	state.gameData.round = 1;
	state.gameData.player.lives = BG_CONSTANTS.INITIAL_PLAYER_LIVES;

	scene.sound.setVolume(getOption("soundVolume") ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
}

export function setupSceneElements() {
	cloudsBackground = new CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});

	scene.cloudsBackground = cloudsBackground.getShader() as any;

	scene.bgContainer = scene.add.container(0, 0);
	ControlsSystem.init(scene);

	scene.bgContainer.add([scene.cloudsBackground, initBlackHole()]);

	Board.init();
}

export function destroy(): void {
	cloudsBackground?.destroy();
	cloudsBackground = null;
}
