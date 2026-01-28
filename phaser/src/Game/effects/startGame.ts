import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";

export async function startGame(isMultiplayer: boolean) {

	await io.Fade(300, 0x000000);

	// if (options?.isArena) {
	// 	const hasActive = await MultiplayerManager.getInstance().checkActiveSession();

	// 	// TOOD: should be used for "continue" inside the arena tab
	// 	if (hasActive) {
	// 		await MultiplayerManager.getInstance().enableMultiplayer();
	// 		io.StartScene(constants.SCENE_KEYS.BATTLEGROUND, options);
	// 		return;
	// 	}
	// }

	io.StartScene(constants.SCENE_KEYS.CRYSTAL_SELECTION, { isMultiplayer });
}
