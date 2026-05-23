import * as constants from "@Constants/constants";
import { getName } from "@i18n/i18n";
import { vec2 } from "@Models/SharedGeometry";
import * as io from "@PhaserIO";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import * as _ from "../CrystalSelectionScene";

export function crystalDisplay() {
	const crystal = _.state.crystals[_.state.currentIndex];

	_.state.crystalSprite = io.scene.add.image(constants.MIDDLE_SCREEN_X, _.SPRITE_Y, crystal.pic);
	_.state.crystalSprite.setDisplaySize(_.CRYSTAL_SPRITE_SIZE, _.CRYSTAL_SPRITE_SIZE);

	io.scene.tweens.add({
		targets: _.state.crystalSprite,
		y: _.SPRITE_Y + _.CRYSTAL_FLOAT_Y_OFFSET,
		duration: _.CRYSTAL_FLOAT_ANIMATION_DURATION,
		ease: _.CRYSTAL_FLOAT_EASE,
		yoyo: true,
		repeat: -1,
	});

	_.state.crystalName = io.Text(getName(crystal.id), {
		...constants.titleTextConfig,
		fontSize: _.CRYSTAL_NAME_FONT_SIZE,
	});
	io.SetPosition(_.state.crystalName, vec2(constants.MIDDLE_SCREEN_X, _.CARD_NAME_Y));
	io.Centralize(_.state.crystalName);

	_.state.descriptionText = new BBCodeText(
		io.scene,
		constants.MIDDLE_SCREEN_X,
		_.DESCRIPTION_Y,
		"",
		{
			fontSize: _.DESCRIPTION_FONT_SIZE,
			fontFamily: "Arimo",
			align: "center",
			color: "#ffffff",
		}
	)
		.setOrigin(_.DESCRIPTION_ORIGIN_X, _.DESCRIPTION_ORIGIN_Y)
		.setWrapMode(1)
		.setLineSpacing(_.DESCRIPTION_LINE_SPACING)
		.setWrapWidth(_.DESCRIPTION_WRAP_WIDTH);
	io.scene.add.existing(_.state.descriptionText);
}
