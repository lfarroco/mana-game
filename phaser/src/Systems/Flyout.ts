
// continue from here:
// create undead units with deathrattle meachnics

import { defaultTextConfig, SCREEN_HEIGHT } from "../Scenes/Battleground/constants";
import { tween } from "../Utils/animation";

const flyoutWidth = 900;

let flyouts: Flyout[] = [];

export class Flyout extends Phaser.GameObjects.Container {

	isOpen = false;
	bg: Phaser.GameObjects.Image;
	titleText: Phaser.GameObjects.Text;

	constructor(scene: Phaser.Scene, title: string) {
		super(scene);
		this.setName(title);
		scene.add.existing(this);
		flyouts.push(this);

		this.bg = scene.add.image(0, 0, "ui/wood_texture").setOrigin(0)
			.setDisplaySize(flyoutWidth, SCREEN_HEIGHT);

		this.titleText = scene.add.text(
			400, 50,
			title,
			{
				...defaultTextConfig,
				color: "#ffffff",
			})
			.setOrigin(0.5)
			.setFontFamily("Arial Black")
			.setStroke("black", 14);

		this.add([this.bg, this.titleText]);

		this.setX(-flyoutWidth);

		this.on("destroy", () => {
			flyouts = flyouts.filter(f => f !== this);
		});

	}

	async slideIn() {

		flyouts
			.filter(f => f.isOpen)
			.forEach(f => f.slideOut())

		this.scene.children.bringToTop(this);
		await tween({
			targets: [this],
			x: 0,
		});
		this.isOpen = true;

	}

	async slideOut() {
		await tween({
			targets: [this],
			x: -flyoutWidth,
		});
		this.isOpen = false;
	}
}

export const create = async (
	scene: Phaser.Scene,
	title: string,
) => {

	const flyout = new Flyout(scene, title);

	return flyout;

}

export function addExitButton(flyout: Flyout, onExit: () => void) {
	const exit = flyout.scene.add.image(0, 0, "icon/exit")
		.setDisplaySize(200, 200)
		.setOrigin(0.5)
		.setInteractive()
		.setPosition(780, flyout.scene.cameras.main.height - 100)
		.on("pointerup", async () => {
			await flyout.slideOut();
			onExit();
		});

	const exitText = flyout.scene.add.text(
		exit.x, exit.y,
		"Exit",
		defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14);

	flyout.add([exit, exitText]);
}
