import { Entity } from "@Models/Entities/Entity";
import { vec2 } from "@Models/Geometry";
import * as io from "@PhaserIO";
import { images } from "../../../assets";
import * as constants from "@Constants/constants";

function create() {
	const logo = io.Image(images.logo.key);
	io.SetPosition(logo, vec2(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y - 200));
	io.Centralize(logo);
	return logo
}

export default {
	key: "logo",
	create,
} as Entity<Phaser.GameObjects.Image>
