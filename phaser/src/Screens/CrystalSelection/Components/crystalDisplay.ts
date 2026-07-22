import * as constants from "@Constants";
import * as i18n from "@i18n/i18n";
import BBCodeText from "phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText";
import * as parent from "../CrystalSelectionScreen";
import { env } from "../../../Env";

const SPRITE_Y = 300;
const CARD_NAME_Y = SPRITE_Y + 150;

// Crystal sprite
const CRYSTAL_SPRITE_SIZE = 200;
const CRYSTAL_FLOAT_ANIMATION_DURATION = 1500;
const CRYSTAL_FLOAT_Y_OFFSET = -10;
const CRYSTAL_FLOAT_EASE = "Sine.InOut";
// Crystal display styling
const CRYSTAL_NAME_FONT_SIZE = "36px";
const DESCRIPTION_FONT_SIZE = "24px";
const DESCRIPTION_LINE_SPACING = 10;
const DESCRIPTION_WRAP_WIDTH = 1100;
const DESCRIPTION_ORIGIN_X = 0.5;
const DESCRIPTION_ORIGIN_Y = 0;
const DESCRIPTION_Y = 500;

export function create() {
	const crystal = parent.state.crystals[parent.state.currentIndex];

	parent.state.crystalSprite = env.scene.add.image(constants.MIDDLE_SCREEN_X, SPRITE_Y, crystal.pic);
	parent.state.crystalSprite.setDisplaySize(CRYSTAL_SPRITE_SIZE, CRYSTAL_SPRITE_SIZE);

	env.scene.tweens.add({
		targets: parent.state.crystalSprite,
		y: SPRITE_Y + CRYSTAL_FLOAT_Y_OFFSET,
		duration: CRYSTAL_FLOAT_ANIMATION_DURATION,
		ease: CRYSTAL_FLOAT_EASE,
		yoyo: true,
		repeat: -1,
	});

	parent.state.crystalName = env.scene.add.text(0, 0, i18n.getName(crystal.id), {
		...constants.titleTextConfig,
		fontSize: CRYSTAL_NAME_FONT_SIZE,
	});
	parent.state.crystalName.setPosition(constants.MIDDLE_SCREEN_X, CARD_NAME_Y);
	parent.state.crystalName.setOrigin(0.5);

	parent.state.descriptionText = new BBCodeText(
		env.scene,
		constants.MIDDLE_SCREEN_X,
		DESCRIPTION_Y,
		"",
		{
			fontSize: DESCRIPTION_FONT_SIZE,
			fontFamily: "Arimo",
			align: "center",
			color: "#ffffff",
		}
	)
		.setOrigin(DESCRIPTION_ORIGIN_X, DESCRIPTION_ORIGIN_Y)
		.setWrapMode(1)
		.setLineSpacing(DESCRIPTION_LINE_SPACING)
		.setWrapWidth(DESCRIPTION_WRAP_WIDTH);
	env.scene.add.existing(parent.state.descriptionText);
}
