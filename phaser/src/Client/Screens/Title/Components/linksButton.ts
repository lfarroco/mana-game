import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as LinksPanel from "Client/Screens/Title/Components/LinksPanel";
import * as constants from "@Constants/constants";
import * as i18n from "@i18n/i18n";

export function create(y: number) {
	const title = i18n.t("title.links");
	return UIButton.create({
		text: `🔗 ${title}`,
		position: Geometry.vec2(constants.MIDDLE_SCREEN_X, y),
		callback: LinksPanel.create,
		tooltip: {
			title,
			description: i18n.t("title.tooltip.links"),
			position: "right",
		},
	});
}
