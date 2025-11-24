import Phaser from "phaser";
import { activateBlackHole } from "../BlackHole";
import { MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y } from "@Constants/constants";

let scene: Phaser.Scene | null = null;
let timerText: Phaser.GameObjects.Text | null = null;
let timerCircle: Phaser.GameObjects.Arc | null = null;
let timerValue: number = 20;
let timerEvent: Phaser.Time.TimerEvent | null = null;

export function initializeCountdownTimer(gameScene: Phaser.Scene): void {
	scene = gameScene;
}

export function start(): void {
	if (!scene) return;

	timerValue = 20;
	// Add a circle background
	timerCircle = scene.add.circle(MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, 40, 0x000000, 0.8);
	timerCircle.setStrokeStyle(4, 0xffffff);
	timerCircle.setDepth(1000);
	timerCircle.setVisible(true);

	timerText = scene.add
		.text(MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, timerValue.toString(), {
			fontSize: "48px",
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 4,
		})
		.setOrigin(0.5);
	timerText.setDepth(1001);
	timerText.setVisible(true);

	timerEvent = scene.time.addEvent({
		delay: 1000,
		callback: updateTimer,
		callbackScope: null,
		loop: true,
	});
}

function updateTimer(): void {
	if (!scene || !timerText) return;

	timerValue--;
	timerText.setText(timerValue.toString());
	if (timerValue <= 0) {
		timerEvent?.destroy();
		timerEvent = null;

		timerText.setVisible(false);
		if (timerCircle) {
			timerCircle.setVisible(false);
		}

		activateBlackHole();
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
