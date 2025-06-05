
// continue from here:
// create undead units with deathrattle meachnics

import { images } from "../assets";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_HEIGHT, titleTextConfig } from "../Scenes/Battleground/constants";
import { tween } from "../Utils/animation";

const flyoutWidth = SCREEN_WIDTH;
const flyoutHeight = SCREEN_HEIGHT / 2;

let flyouts: Flyout[] = [];

//@ts-ignore
window.flyouts = flyouts;

export class Flyout extends Phaser.GameObjects.Container {

	isOpen = false;
	bg: Phaser.GameObjects.Graphics;
	titleText: Phaser.GameObjects.Text;

	constructor(scene: Phaser.Scene, title: string) {
		super(scene);
		this.setName(title);
		scene.add.existing(this);
		flyouts.push(this);

		this.bg = scene.add.graphics()
			.fillStyle(0x666666, 0.8)
			.fillRect(0, 0, flyoutWidth, flyoutHeight)
			.setPosition(0, 0);

		this.bg.setInteractive();

		this.titleText = scene.add.text(
			SCREEN_WIDTH / 2,
			TILE_HEIGHT / 2,
			title,
			titleTextConfig,
		).setOrigin(0.5);

		this.add([this.bg, this.titleText]);

		this.setY(-flyoutHeight);

		this.on("destroy", () => {
			flyouts = flyouts.filter(f => f !== this);
		});

	}

	async slideIn() {

		// flyouts
		// 	.filter(f => f.isOpen)
		// 	.forEach(f => f.slideOut())

		this.scene.children.bringToTop(this);
		await tween({
			targets: [this],
			y: 0,
		});
		this.isOpen = true;

	}

	// TODO: check if multiple flyouts are kept 
	async slideOut() {
		await tween({
			targets: [this],
			y: -flyoutHeight,
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
	const exit = flyout.scene.add.image(
		0, 0,
		images.exit.key)
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
