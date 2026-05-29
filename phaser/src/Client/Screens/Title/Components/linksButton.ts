import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openLinksPanel } from "Client/Screens/Title/Components/LinksPanel";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";

export function render(y: number) {
	const title = t("title.links");
	const button = createUIButton({
		text: `🔗 ${title}`,
		position: vec2(constants.MIDDLE_SCREEN_X, y),
		callback: openLinksPanel,
		tooltip: {
			title,
			description: t("title.tooltip.links"),
			position: "right",
		},
	});
	return button;
}
