import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { SCREEN_HEIGHT } from "../constants/constants";
import { tween } from "../Utils/animation";
import { audioManager } from "../Systems/AudioManager";


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

		try {
			audioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_enter');
		} catch (error) {
			console.warn('Could not play modal window enter sound:', error);
		}

		this.scene.children.bringToTop(this);
		await tween({
			targets: [this],
			y: 0,
		});
		this.isOpen = true;

	}

	// TODO: check if multiple flyouts are kept 
	async slideOut() {

		try {
			audioManager.playSoundEffect('sfx_ui_modalwindow_swoosh_exit');
		} catch (error) {
			console.warn('Could not play modal window exit sound:', error);
		}

		await tween({
			targets: [this],
			y: -SCREEN_HEIGHT,
		});
		this.isOpen = false;
	}
}

