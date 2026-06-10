import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";

export function create(y: number) {
	const label = i18n.t("title.multiplayer");
	return UIButton.create({
		text: label,
		position: [
			constants.MIDDLE_SCREEN_X,
			y,
		],
		callback: () => {
			const playerId = localStorage.getItem("mana_player_id");
			if (playerId) {
				//getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOBBY);
			} else {
				//getCurrentScene().scene.start(constants.SCENE_KEYS.ARENA_LOGIN);
			}
		},
		tooltip: {
			title: label,
			description: i18n.t("title.tooltip.multiplayer"),
			position: "right",
		},
	});
}
