
// continue from here:
// create undead units with deathrattle meachnics

import { defaultTextConfig, SCREEN_HEIGHT } from "../Scenes/Battleground/constants";
import { tween } from "../Utils/animation";

const flyoutWidth = 900;

export const Flyout = async (
	scene: Phaser.Scene,
	title: string,
	onExit: (() => void) | null, //todo: move this to a "addExit" function
) => {

	const flyout = scene.add.container();

	const bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0)
		.setDisplaySize(flyoutWidth, SCREEN_HEIGHT);

	const titleText = scene.add.text(
		400, 50,
		title,
		{
			...defaultTextConfig,
			color: "#ffffff",
		})
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14);

	flyout.add([bg, titleText]);

	if (onExit) {

		const exit = scene.add.image(0, 0, "icon/exit")
			.setScale(0.2)
			.setOrigin(0.5)
			.setInteractive()
			.setPosition(780, scene.cameras.main.height - 100)
			.on("pointerup", async () => {
				await retractFlyout(flyout);
				onExit();
			});

		const exitText = scene.add.text(
			exit.x, exit.y,
			"Exit",
			defaultTextConfig,
		)
			.setOrigin(0.5)
			.setFontFamily("Arial Black")
			.setStroke("black", 14);

		flyout.add([exit, exitText]);
	}

	flyout.setX(-flyoutWidth);

	return flyout;

}

export async function slideFlyoutIn(flyout: Phaser.GameObjects.Container) {
	flyout.scene.children.bringToTop(flyout);
	await tween({
		targets: [flyout],
		x: 0,
	})
}

export async function retractFlyout(flyout: Phaser.GameObjects.Container) {
	await tween({
		targets: [flyout],
		x: -flyoutWidth,
	})
}