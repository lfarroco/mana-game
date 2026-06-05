import * as constants from "@Constants/constants";
import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as i18n from "@i18n/i18n";

export function render(y: number) {
	const title = i18n.t("title.multiplayer");
	const btn = UIButton.create({
		text: title,
		position: Geometry.vec2(constants.MIDDLE_SCREEN.x, y),
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
			description: i18n.t("title.tooltip.multiplayer"),
			position: "right",
		},
	});

	return btn;
}
