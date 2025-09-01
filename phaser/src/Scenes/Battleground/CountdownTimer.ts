import Phaser from "phaser";

export class CountdownTimer {
	private scene: Phaser.Scene;
	private timerText!: Phaser.GameObjects.Text;
	private timerCircle!: Phaser.GameObjects.Arc;
	private timerValue: number = 10;
	private timerEvent?: Phaser.Time.TimerEvent;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
	}

	start(): void {
		this.timerValue = 10;
		const centerX = this.scene.scale.width / 2;
		const centerY = 50;

		// Add a circle background
		this.timerCircle = this.scene.add.circle(centerX, centerY, 40, 0x000000, 0.8);
		this.timerCircle.setStrokeStyle(4, 0xffffff);
		this.timerCircle.setDepth(1000);

		this.timerText = this.scene.add.text(centerX, centerY, this.timerValue.toString(), {
			fontSize: '48px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4
		}).setOrigin(0.5);
		this.timerText.setDepth(1001);

		this.timerEvent = this.scene.time.addEvent({
			delay: 1000,
			callback: this.updateTimer,
			callbackScope: this,
			loop: true
		});
	}

	private updateTimer(): void {
		this.timerValue--;
		this.timerText.setText(this.timerValue.toString());
		if (this.timerValue <= 0) {
			this.timerEvent?.destroy();
			// Keep the timer visible at 0
		}
	}

	stop(): void {
		this.timerEvent?.destroy();
		if (this.timerText) {
			this.timerText.destroy();
		}
		if (this.timerCircle) {
			this.timerCircle.destroy();
		}
	}

	get circle(): Phaser.GameObjects.Arc {
		return this.timerCircle;
	}
}
