import { State } from "@Models/State";
import * as ControlsSystem from "@Systems/Controls";
import * as Board from "@Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { scene } from "../BattlegroundScene";
import { getOption } from "@Models/OptionsStore";
import { CloudsBackground } from "../../../components/cloudBackground/CloudsBackground";
import * as UI from "@UI/index";

export let cloudsBackground: CloudsBackground | null = null;


export function initializeNewGame(state: State): void {

	state.gameData.player.units = [];
	state.gameData.round = 1;
	state.gameData.player.prestige = 0;
	state.gameData.player.gold = BG_CONSTANTS.INITIAL_PLAYER_GOLD;;
	UI.updatePrestige(state.gameData.player.prestige, 0);

	scene.sound.setVolume(getOption('soundVolume') ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
}

export function setupSceneElements(_state: State) {
	cloudsBackground = new CloudsBackground(scene, {
		preset: 'forest',
		depth: -2000,
		timeScale: 0.3
	});

	scene.cloudsBackground = cloudsBackground.getShader() as any;

	scene.bgContainer = scene.add.container(0, 0);
	ControlsSystem.init(scene);

	scene.bgContainer.add([scene.cloudsBackground]);

	const playerBoard = Board.init();
	Board.initializeBoardDropZones();
	return playerBoard;
}

export function destroy(): void {
	cloudsBackground?.destroy();
	cloudsBackground = null;
}