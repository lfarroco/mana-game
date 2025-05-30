import Phaser from "phaser";
import { tween } from "../../Utils/animation";
import * as constants from "./constants";
import * as assets from "../../assets";

export async function battleResultAnimation(
	scene: Scene,
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
	revealMask.setVisible(false); // mask itself shouldn't be shown

	const mask = new Phaser.Display.Masks.BitmapMask(scene, revealMask);
	banner.setMask(mask);

	// Move the mask to the right
	await tween({
		targets: [revealMask],
		x: banner.x, // move rightward
		duration: 1500,
	});

	// Move the mask even more to the right
	await tween({
		targets: [revealMask],
		x: banner.x + revealMask.width, // move rightward
		duration: 1500,
	});

}
