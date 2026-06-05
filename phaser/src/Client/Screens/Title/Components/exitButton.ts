import * as Geometry from "@Models/Geometry";
import * as UIButton from "@Components/Button/UIButton";
import * as i18n from "@i18n/i18n";
import * as constants from "../../../../Constants";
import * as Effects from "../Effects";

export const create = (y: number) =>
	UIButton.create({
		text: i18n.t("title.exit"),
		position: Geometry.vec2(
			constants.MIDDLE_SCREEN_X,
			y
		),
		callback: Effects.exitGame,
	});