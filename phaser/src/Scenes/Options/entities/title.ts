import * as constants from "@Constants/constants";
import { vec2 } from "@Models/Geometry";
import { Text, Centralize } from "@PhaserIO";
import * as Phaser from "phaser";
import { LAYOUT } from "../LAYOUT";
import { Entity } from "@Models/Entities/Entity";

function create(): Phaser.GameObjects.Text {
	const el = Text(
		vec2(constants.MIDDLE_SCREEN_X, LAYOUT.TITLE_Y),
		'OPTIONS',
		{
			...constants.titleTextConfig,
			fontSize: LAYOUT.TITLE_FONT_SIZE
		}
	);
	Centralize(el);
	return el;
};


const element: Entity<Phaser.GameObjects.Text> = {
	key: "options/title",
	create
}

export default element;