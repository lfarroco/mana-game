import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { startGame } from "../../../Game/effects/startGame";
import { MultiplayerManager } from "../../../Multiplayer/MultiplayerManager";


export function arenaButton(y: number) {
	const btn = createUIButton(
		"Arena", // TODO: Add translation t("title.arena")
		vec2(constants.MIDDLE_SCREEN.x, y),
		() => startGame({ isArena: true })
	);

	MultiplayerManager.getInstance().checkActiveSession().then((isActive) => {
		if (isActive) {
			btn.text.setText("Arena (Continue)");
		}
	});

	return btn;
}
