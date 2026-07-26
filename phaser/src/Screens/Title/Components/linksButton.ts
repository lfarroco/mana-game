import * as UIButton from "@Components/Button/UIButton";
import * as LinksPanel from "../../../Screens/Title/Components/LinksPanel";
import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";

const BUTTON_Y = 800;

export function create() {
	const title = i18n.t("title.links");
	return UIButton.create({
		text: `🔗 ${title}`,
		position: [constants.MIDDLE_SCREEN_X, BUTTON_Y],
		callback: LinksPanel.create,
		tooltip: {
			title,
			description: i18n.t("title.tooltip.links"),
			position: "right",
		},
	});
}
