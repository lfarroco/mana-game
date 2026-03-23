import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { getCurrentScene } from "@Models/State";


export function arenaButton(y: number) {
	const btn = createUIButton(
		t("title.multiplayer"),
		vec2(constants.MIDDLE_SCREEN.x, y),
		() => {
			const playerId = localStorage.getItem("mana_player_id");
			if (playerId) {
				getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOBBY);
			} else {
				getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOGIN);
			}
		}
	);

	return btn;
}
