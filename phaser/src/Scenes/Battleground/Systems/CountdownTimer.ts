import Phaser from "phaser";
import { activateBlackHole, BlackHoleState } from "../BlackHole";
import { MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, TIMEOUT_DAMAGE_START_TIME } from "@Constants/constants";

export type CountdownTimerState = {
	scene: Phaser.Scene;
	timerText: Phaser.GameObjects.Text | null;
	timerCircle: Phaser.GameObjects.Arc | null;
	timerValue: number;
	timerEvent: Phaser.Time.TimerEvent | null;
	blackHoleState: BlackHoleState;
};

export function initializeCountdownTimer(gameScene: Phaser.Scene, blackHoleState: BlackHoleState): CountdownTimerState {
	return {
		scene: gameScene,
		timerText: null,
		timerCircle: null,
		timerValue: 30,
		timerEvent: null,
		blackHoleState,
	};
}

export function start(timerState: CountdownTimerState): CountdownTimerState {
	const newTimerValue = TIMEOUT_DAMAGE_START_TIME / 1000;

	const timerCircle = timerState.scene.add.circle(MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, 40, 0x000000, 0.8);
	timerCircle.setStrokeStyle(4, 0xffffff);
	timerCircle.setDepth(1000);
	timerCircle.setVisible(false);

	const timerText = timerState.scene.add
		.text(MIDDLE_SCREEN_X, MIDDLE_SCREEN_Y, newTimerValue.toString(), {
			fontSize: "48px",
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 4,
		})
		.setOrigin(0.5);
	timerText.setDepth(1001);
	timerText.setVisible(false);

	const updateTimer = makeUpdateTimer(timerState, timerText, timerCircle);

	const timerEvent = timerState.scene.time.addEvent({
		delay: 1000,
		callback: updateTimer,
		callbackScope: null,
		loop: true,
	});

	return {
		...timerState,
		timerValue: newTimerValue,
		timerCircle,
		timerText,
		timerEvent,
	};
}

function makeUpdateTimer(
	timerState: CountdownTimerState,
	timerText: Phaser.GameObjects.Text,
	timerCircle: Phaser.GameObjects.Arc
) {
	return function updateTimer(): void {
		timerState.timerValue--;
		timerText.setText(timerState.timerValue.toString());
		if (timerState.timerValue <= 10) {
			timerText.setVisible(true);
			timerCircle.setVisible(true);
		}
		if (timerState.timerValue <= 0) {
			timerState.timerEvent?.destroy();
			timerState.timerEvent = null;

			timerText.setVisible(false);
			timerCircle.setVisible(false);

			timerState.blackHoleState = activateBlackHole(timerState.blackHoleState);
		}
	};
}

export function stop(timerState: CountdownTimerState): CountdownTimerState {
	if (timerState.timerEvent) {
		timerState.timerEvent.destroy();
	}
	if (timerState.timerText) {
		timerState.timerText.destroy();
	}
	if (timerState.timerCircle) {
		timerState.timerCircle.destroy();
	}

	return {
		...timerState,
		timerEvent: null,
		timerText: null,
		timerCircle: null,
	};
}

export function getCircle(timerState: CountdownTimerState): Phaser.GameObjects.Arc | null {
	return timerState.timerCircle;
}

