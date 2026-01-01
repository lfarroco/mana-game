import * as constants from "@Constants/constants";
import * as io from "@PhaserIO";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";

export async function startGame(options?: any) {
	await io.Fade(300, 0x000000);

	if (options?.isArena) {
		const hasActive = await MultiplayerManager.getInstance().checkActiveSession();
		if (hasActive) {
			await MultiplayerManager.getInstance().enableMultiplayer();
			io.StartScene(constants.SCENE_KEYS.BATTLEGROUND, options);
			return;
		}
	}

	io.StartScene(constants.SCENE_KEYS.CRYSTAL_SELECTION, options);
}
