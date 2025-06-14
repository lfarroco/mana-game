import { images } from "../assets";
import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { defaultTextConfig, SCREEN_HEIGHT, SCREEN_WIDTH, TILE_HEIGHT, titleTextConfig } from "../constants/constants";
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

	constructor(public parent: BattlegroundScene, title: string) {
		super(parent);
		this.setName(title);
		parent.add.existing(this);
		flyouts.push(this);

		this.bg = parent.add.graphics()
			.fillStyle(0x666666, 0.8)
			.fillRect(0, 0, flyoutWidth, flyoutHeight)
			.setPosition(0, 0);

		this.bg.setInteractive();

		this.titleText = parent.add.text(
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

		this.parent.children.bringToTop(this);
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

export function addExitButton(flyout: Flyout, onExit: () => void) {
	const exit = flyout.parent.add.image(
		0, 0,
		images.exit.key)
		.setDisplaySize(200, 200)
		.setOrigin(0.5)
		.setInteractive()
		.setPosition(780, flyout.parent.cameras.main.height - 100)
		.on("pointerup", async () => {
			await flyout.slideOut();
			onExit();
		});

	const exitText = flyout.parent.add.text(
		exit.x, exit.y,
		"Exit",
		defaultTextConfig,
	)
		.setOrigin(0.5)
		.setFontFamily("Arial Black")
		.setStroke("black", 14);

	flyout.add([exit, exitText]);
}
