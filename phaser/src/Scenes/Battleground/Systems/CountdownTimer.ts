import Phaser from "phaser";

// Module-level state
let scene: Phaser.Scene | null = null;
let timerText: Phaser.GameObjects.Text | null = null;
let timerCircle: Phaser.GameObjects.Arc | null = null;
let timerValue: number = 10;
let timerEvent: Phaser.Time.TimerEvent | null = null;

export function initializeCountdownTimer(gameScene: Phaser.Scene): void {
	scene = gameScene;
}

export function start(): void {
	if (!scene) return;

	timerValue = 10;
	const centerX = scene.scale.width / 2;
	const centerY = 50;

	// Add a circle background
	timerCircle = scene.add.circle(centerX, centerY, 40, 0x000000, 0.8);
	timerCircle.setStrokeStyle(4, 0xffffff);
	timerCircle.setDepth(1000);

	timerText = scene.add.text(centerX, centerY, timerValue.toString(), {
		fontSize: '48px',
		color: '#ffffff',
		stroke: '#000000',
		strokeThickness: 4
	}).setOrigin(0.5);
	timerText.setDepth(1001);

	timerEvent = scene.time.addEvent({
		delay: 1000,
		callback: updateTimer,
		callbackScope: null,
		loop: true
	});
}

function updateTimer(): void {
	if (!scene || !timerText) return;

	timerValue--;
	timerText.setText(timerValue.toString());
	if (timerValue <= 0) {
		timerEvent?.destroy();
		timerEvent = null;
		// Keep the timer visible at 0
	}
}

export function stop(): void {
	if (timerEvent) {
		timerEvent.destroy();
		timerEvent = null;
	}
	if (timerText) {
		timerText.destroy();
		timerText = null;
	}
	if (timerCircle) {
		timerCircle.destroy();
		timerCircle = null;
	}
}

export function getCircle(): Phaser.GameObjects.Arc | null {
	return timerCircle;
}

export function destroy(): void {
	stop();
	scene = null;
}
