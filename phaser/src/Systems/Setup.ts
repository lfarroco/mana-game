import { getCurrentScene, getState } from "@Models/State";
import * as ControlsSystem from "@Systems/Controls";
import * as Board from "@Models/Board";
import * as BG_CONSTANTS from "Client/Scenes/Battleground/battlegroundConstants";
import { getOption } from "@Models/OptionsStore";
import { CloudsBackground } from "@Components/cloudBackground/CloudsBackground";
import BattlegroundScene from "Client/Scenes/Battleground/BattlegroundScene";
import { makeUnit } from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";

export let cloudsBackground: CloudsBackground | null = null;

export function initializeNewGame(selectedCrystalId: string): void {
	const state = getState();

	state.session.team.units = [];
	state.session.round = 1;
	state.session.losses = 0; // BG_CONSTANTS.INITIAL_PLAYER_LIVES is 4, so 0 losses

	const crystalUnit = makeUnit(constants.FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
	state.session.team.units.push(crystalUnit);
	state.session.step = 0;

	getCurrentScene().sound.setVolume(getOption("soundVolume") ?? BG_CONSTANTS.DEFAULT_SCENE_SOUND_VOLUME);
}

export function setupSceneElements() {
	cloudsBackground = new CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});

	const scene = getCurrentScene() as BattlegroundScene;

	const cloudsBackgroundShader = cloudsBackground.getShader();

	const bgContainer = scene.add.container(0, 0);
	bgContainer.setDepth(-2000);
	bgContainer.add([cloudsBackgroundShader]);

	Board.init();

	ControlsSystem.init(scene, { context: "battleground" });
}

export function destroy(): void {
	cloudsBackground?.destroy();
	cloudsBackground = null;
}
