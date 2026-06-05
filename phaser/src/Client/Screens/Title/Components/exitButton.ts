import * as Geometry from "@Models/Geometry";
import * as UIButton from "Client/Components/UIButton";
import * as i18n from "@i18n/i18n";
import * as constants from "@Constants/constants";
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