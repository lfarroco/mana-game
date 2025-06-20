import BattlegroundScene from "../Scenes/Battleground/BattlegroundScene";
import { SCREEN_HEIGHT } from "../constants/constants";
import { tween } from "../Utils/animation";


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

	async slideIn() {

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
			y: -SCREEN_HEIGHT,
		});
		this.isOpen = false;
	}
}

