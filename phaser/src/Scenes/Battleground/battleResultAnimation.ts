import Phaser from "phaser";
import { tween } from "../../Utils/animation";
import * as constants from "../../constants/constants";
import * as assets from "../../assets";
import { scene } from "./BattlegroundScene";

export async function battleResultAnimation(
	result: "victory" | "defeat",
) {
	const image = result === "defeat" ? assets.images.defeat : assets.images.victory;
	const banner = scene.add.image(
		constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT / 2,
		image.key)
		.setOrigin(0.5, 0.5);

	const revealMask = scene.add.image(
		0, constants.SCREEN_HEIGHT / 2,
		assets.images.reveal_mask.key)
		.setOrigin(0.5, 0.5)
		.setScale(1);
	revealMask.setVisible(false);

	const mask = new Phaser.Display.Masks.BitmapMask(scene, revealMask);
	banner.setMask(mask);

	await tween({
		targets: [revealMask],
		x: banner.x,
		duration: 1500,
	});

	await tween({
		targets: [revealMask],
		x: banner.x + revealMask.width,
		duration: 1500,
	});

}
