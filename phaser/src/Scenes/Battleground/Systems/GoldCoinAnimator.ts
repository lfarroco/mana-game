import Phaser from "phaser";
import { delay } from "../../../Utils/animation";
import { State } from "../../../Models/State";

/**
 * Manages the animation of gold coins, typically when gold is acquired by the player.
 * This class encapsulates the logic for creating coin sprites, animating their drop,
 * and their movement towards a target (e.g., a gold chest icon or UI element).
 */
export class GoldCoinAnimator {
	/** The Phaser.Scene instance where animations will be rendered. */
	private scene: Phaser.Scene;
	/** The current game state, used to access options like animation speed. */
	private state: State;

	/**
	 * Initializes the GoldCoinAnimator.
	 * @param scene - The Phaser.Scene instance to which animations will be added.
	 * @param state - The current game state, primarily used for accessing animation speed settings.
	 */
	constructor(scene: Phaser.Scene, state: State) {
		this.scene = scene;
		this.state = state;
	}

	/**
	 * Creates and animates multiple coin sprites.
	 * The animation involves coins appearing, dropping slightly, and then tweening
	 * towards a predefined "chest" location on the screen, fading out upon arrival.
	 * It also creates particle effects at the destination.
	 * @param coins The number of visual coin sprites to animate.
	 * @param x The starting x-coordinate for the coin animation.
	 * @param y The starting y-coordinate for the coin animation.
	 * @param onGoldArrive Optional callback when coins reach the chest.
	 */
	public async animateCoinDrop(
		coins: number,
		x: number,
		y: number,
		onGoldArrive?: () => void
	): Promise<void> {
		const currentSpeed = this.state.options.speed;
		const chestX = this.scene.cameras.main.width - 150;
		const chestY = this.scene.cameras.main.height - 100;

		for (let i = 0; i < coins; i++) {
			const coin = this.scene.add.image(0, 0, 'coin').setOrigin(0.5, 0.5)
				.setPosition(x + Math.random() * 200, y + Math.random() * 150)
				.setAlpha(0)
				.setRotation(Math.random() * Math.PI * 2);

			this.scene.tweens.add({
				targets: coin,
				alpha: 1,
				duration: (500 / currentSpeed) * Math.max(Math.random(), 0.5),
			});

			this.scene.tweens.add({
				targets: coin,
				scaleY: 0.5,
				duration: 100 / currentSpeed,
				yoyo: true,
				repeat: -1
			});

			this.scene.tweens.add({
				targets: coin,
				y: coin.y - 150,
				ease: "Quad.Out",
				duration: 300 / currentSpeed,
				onComplete: () => {
					const distance = Phaser.Math.Distance.Between(coin.x, coin.y, chestX, chestY);
					this.scene.tweens.add({
						targets: coin,
						x: chestX,
						y: chestY,
						alpha: 0.5,
						duration: distance / (3 * currentSpeed),
						ease: "Quad.In",
						onComplete: () => {
							coin.destroy();
							if (onGoldArrive && i === coins - 1) onGoldArrive();
						}
					});
				}
			});
		}

		await delay(this.scene, 1000 / currentSpeed);

		this.scene.add.particles(chestX, chestY, 'coin', {
			speed: { min: 100, max: 200 },
			lifespan: 500,
			alpha: { start: 1.4, end: 0 },
			angle: { min: 0, max: 360 },
			quantity: coins * 2,
			frequency: 100,
			maxParticles: coins * 2,
			rotate: { min: 0, max: 360 },
			scaleY: { start: -1, end: 1 }
		});
	}
}
