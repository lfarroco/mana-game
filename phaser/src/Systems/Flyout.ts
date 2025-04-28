
// continue from here:
// create undead units with deathrattle meachnics

import { defaultTextConfig } from "../Scenes/Battleground/constants";
import { tween } from "../Utils/animation";

export const Flyout = async (
	scene: Phaser.Scene,
	title: string,
	allowExit: boolean,
	renderContent: (flyout: Phaser.GameObjects.Container, resolve: () => void) => void,
) => new Promise<void>((resolve) => {

	const flyout = scene.add.container();

	const bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0);

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

	if (allowExit) {

		const exit = scene.add.image(0, 0, "icon/exit")
			.setScale(0.2)
			.setOrigin(0.5)
			.setInteractive()
			.setPosition(900, scene.cameras.main.height - 100)
			.on("pointerup", () => {
				flyout.destroy();
				resolve();
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

	renderContent(flyout, resolve)

	flyout.setX(- 400);

	tween({
		targets: [flyout],
		x: 0,
	})

});