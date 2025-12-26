import { getCurrentScene, getState } from "@Models/State";
import * as ControlsSystem from "@Systems/Controls";
import * as Board from "@Models/Board";
import * as BG_CONSTANTS from "../battlegroundConstants";
import { getOption } from "@Models/OptionsStore";
import { CloudsBackground } from "../../../Components/cloudBackground/CloudsBackground";
import { initBlackHole } from "../BlackHole";
import BattlegroundScene from "../BattlegroundScene";
import { makeUnit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";

export let cloudsBackground: CloudsBackground | null = null;

export function initializeNewGame(selectedCrystalId: string): void {
	const state = getState();

	state.gameData.player.units = [];
	state.gameData.round = 1;
	state.gameData.player.lives = BG_CONSTANTS.INITIAL_PLAYER_LIVES;

	const crystalUnit = makeUnit(constants.FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
	state.gameData.player.units.push(crystalUnit);
	state.gameData.hour = 0;

	getCurrentScene().sound.setVolume(getOption("soundVolume") ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
}

export function setupSceneElements() {
	cloudsBackground = new CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});

	const scene = getCurrentScene() as BattlegroundScene;

	scene.cloudsBackground = cloudsBackground.getShader();

	scene.bgContainer = scene.add.container(0, 0);
	ControlsSystem.init(scene);

	scene.bgContainer.add([scene.cloudsBackground, initBlackHole().blackHole!]);

	Board.init();
}

export function destroy(): void {
	cloudsBackground?.destroy();
	cloudsBackground = null;
}
