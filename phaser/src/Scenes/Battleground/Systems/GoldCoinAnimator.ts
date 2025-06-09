import Phaser from "phaser";
import { delay } from "../../../Utils/animation";
import { State } from "../../../Models/State";

/**
 * Handles the gold coin drop and fly-to-chest animation.
 */
export class GoldCoinAnimator {
	private scene: Phaser.Scene;
	private state: State;

	constructor(scene: Phaser.Scene, state: State) {
		this.scene = scene;
		this.state = state;
	}

	/**
	 * Simulates coins dropping and flying towards the gold display area.
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
