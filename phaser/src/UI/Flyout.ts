import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { SCREEN_HEIGHT } from "../constants/constants";
import { tween } from "../Utils/animation";
import * as AudioManager from "../Systems/AudioManager";

let flyouts: Flyout[] = [];

export class Flyout extends Phaser.GameObjects.Container {

	isOpen = false;

	constructor(scene: BattlegroundScene) {
		super(scene);
		this.scene = scene;
		scene.add.existing(this);
		flyouts.push(this);

		this.setY(-SCREEN_HEIGHT);

		this.on("destroy", () => {
			flyouts = flyouts.filter(f => f !== this);
		});

	}

	/**
	 * Brings a specific child to the top of this flyout container
	 */
	bringChildToTop(child: Phaser.GameObjects.GameObject): void {
		this.bringToTop(child);
	}

	async slideIn() {

		AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');

		this.scene.children.bringToTop(this);
		await tween({
			targets: [this],
			y: 0,
		});
		this.isOpen = true;

	}

	// TODO: check if multiple flyouts are kept 
	async slideOut() {

		AudioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');

		await tween({
			targets: [this],
			y: -SCREEN_HEIGHT,
		});
		this.isOpen = false;
	}
}

