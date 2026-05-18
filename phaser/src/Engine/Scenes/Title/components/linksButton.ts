import { vec2 } from "@Models/Geometry";
import { createUIButton } from "@Components/UIButton";
import { openLinksPanel } from "@Scenes/Title/components/LinksPanel";
import * as constants from "@Constants/constants";
import { t } from "@i18n/i18n";

export function linksButton(y: number) {
	const title = t("title.links");
	const button = createUIButton(
		`🔗 ${title}`,
		vec2(constants.MIDDLE_SCREEN_X, y),
		openLinksPanel,
		undefined,
		undefined,
		{
			title,
			description: t("title.tooltip.links"),
			position: "right",
		}
	);
	return button;
}
