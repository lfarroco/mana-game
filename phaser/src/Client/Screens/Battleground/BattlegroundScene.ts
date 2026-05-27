import * as Board from "@Models/Board";
import * as OptionsStore from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as Tooltip from "@Components/Tooltip";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "@Systems/Encounter";
import * as handleCombatPhase from "@Screens/Battleground/handleCombatPhase";
import * as handleShopPhase from "./Shop/handleShopPhase";

import * as Shop from "./Shop/ShopPanel";
import * as Components from "./Components"

const DEFAULT_SCENE_SOUND_VOLUME = 0.05;

export const createBattlegroundScreen = async () => {
	const speed = OptionsStore.getOption("speed");
	io.scene.time.timeScale = speed;
	io.scene.tweens.timeScale = speed;

	io.scene.sound.setVolume(OptionsStore.getOption("soundVolume") ?? DEFAULT_SCENE_SOUND_VOLUME);

	Components.create();

	AudioManager.playMusic("music_battlemap_vetruv");

	const summonPromises = state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});
	await Promise.all(summonPromises);

	Shop.refresh(null);

	Tooltip.init();

	Board.setIsInputEnabled(true);

	ControlsSystem.init({ context: "battleground" });

	// ~~~~~ // ~~~~~ //

	await runPhaseLoop();

};

async function runPhaseLoop() {
	while (true) {

		switch (state.session.phase) {
			case "encounter":
				state.session = await Encounter.displayOptions();
				break;

			case "combat":
				state.session = await handleCombatPhase.handleCombatPhase();
				break;

			case "shop":
				state.session = await handleShopPhase.handleShopPhase();
				break;
			case "game_over":
				return;
			default:
				throw new Error(`Unknown phase: ${state.session.phase}`);
				return;

		}

	}
}


