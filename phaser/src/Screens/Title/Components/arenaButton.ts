import * as constants from "@Constants";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";

const BUTTON_Y = 600;

export function create() {
	const label = i18n.t("title.multiplayer");
	const btn = UIButton.create({
		text: label,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
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

	return btn.container;
}
