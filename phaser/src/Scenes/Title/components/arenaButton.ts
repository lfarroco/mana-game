import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";
import { MultiplayerManager } from "../../../Multiplayer/MultiplayerManager";
import { t } from "@i18n/i18n";
import { getCurrentScene } from "@Models/State";


export function arenaButton(y: number) {
	let isSessionActive = false;

	const btn = createUIButton(
		t("title.arena"),
		vec2(constants.MIDDLE_SCREEN.x, y),
		() => {
			if (isSessionActive) {
				startGame({ isArena: true });
			} else {
				getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOBBY);
			}
		}
	);

	MultiplayerManager.getInstance().checkActiveSession().then((isActive) => {
		isSessionActive = isActive;
		if (isActive) {
			btn.text.setText(
				t("title.arena_continue"));
		}
	});

	return btn;
}
