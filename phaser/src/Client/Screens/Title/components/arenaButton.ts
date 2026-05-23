import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";

export function arenaButton(y: number) {
	const title = t("title.multiplayer");
	const btn = createUIButton({
		text: title,
		position: vec2(constants.MIDDLE_SCREEN.x, y),
		callback: () => {
			const playerId = localStorage.getItem("mana_player_id");
			if (playerId) {
				//getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOBBY);
			} else {
				//getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOGIN);
			}
		},
		tooltip: {
			title,
			description: t("title.tooltip.multiplayer"),
			position: "right",
		},
	});

	return btn;
}
