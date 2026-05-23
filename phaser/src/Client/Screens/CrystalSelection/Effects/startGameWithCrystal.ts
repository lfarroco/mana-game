import * as io from "@PhaserIO";
import * as _ from "../CrystalSelectionScene";

export async function startGameWithCrystal() {
	const selectedCrystal = _.state.crystals[_.state.currentIndex];

	// Initialize game session through server adapter
	// This works for both single-player and multiplayer
	await io.FadeOut(300, 0x000000);

	_.logger.info(">>> Starting game with crystal:", selectedCrystal.id);

	_.logger.error("!! update code to start bg scene");
	// Pass to battleground scene which will initialize via server
	// this.scene.start(constants.SCENE_KEYS.BATTLEGROUND, {
	// 	selectedCrystalId: selectedCrystal.id,
	// 	isMultiplayer: state.isMultiplayer,
	// 	multiplayerQueueType: state.multiplayerQueueType,
	// });
}
