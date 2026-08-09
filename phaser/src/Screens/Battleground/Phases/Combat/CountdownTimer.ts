import * as BlackHole from "../../Components/BlackHole/BlackHole";
import type * as BlackHoleState from "./BlackHoleState";
import * as constants from "@Constants";
import * as CoreConstants from "@game/Constants";

const MS_PER_SECOND = 1000;
const TIMER_CIRCLE_DEPTH = 1000;
const TIMER_TEXT_DEPTH = 1001;
const TIMER_WARNING_THRESHOLD_SECONDS = 10;

export type CountdownTimerState = {
	scene: Phaser.Scene;
	timerText: Phaser.GameObjects.Text | null;
	timerCircle: Phaser.GameObjects.Arc | null;
	timerValue: number;
	accumulatedMs: number;
	blackHoleState: BlackHoleState.BlackHoleState;
};

export function initializeCountdownTimer(
	gameScene: Phaser.Scene,
	blackHoleState: BlackHoleState.BlackHoleState
): CountdownTimerState {
	return {
		scene: gameScene,
		timerText: null,
		timerCircle: null,
		timerValue: 30,
		accumulatedMs: 0,
		blackHoleState,
	};
}

export function start(timerState: CountdownTimerState): CountdownTimerState {
	const newTimerValue = CoreConstants.TIMEOUT_DAMAGE_START_TIME / MS_PER_SECOND;

	const timerCircle = timerState.scene.add.circle(
		constants.MIDDLE_SCREEN_X,
		constants.MIDDLE_SCREEN_Y,
		40,
		0x000000,
		0.8
	);
	timerCircle.setStrokeStyle(4, 0xffffff);
	timerCircle.setDepth(TIMER_CIRCLE_DEPTH);
	timerCircle.setVisible(false);

	const timerText = timerState.scene.add
		.text(constants.MIDDLE_SCREEN_X, constants.MIDDLE_SCREEN_Y, newTimerValue.toString(), {
			fontSize: "48px",
			color: "#ffffff",
			stroke: "#000000",
			strokeThickness: 4,
		})
		.setOrigin(0.5);
	timerText.setDepth(TIMER_TEXT_DEPTH);
	timerText.setVisible(false);

	// Mutate the state object so the caller can use it
	timerState.timerValue = newTimerValue;
	timerState.accumulatedMs = 0;
	timerState.timerCircle = timerCircle;
	timerState.timerText = timerText;

	return timerState;
}

/**
 * Drive the countdown using the provided delta (should already be scaled by game speed).
 * Should be called every frame from the playback update loop.
 */
export function updateFromDelta(
	timerState: CountdownTimerState,
	delta: number
): CountdownTimerState {
	if (timerState.timerValue <= 0) return timerState;

	timerState.accumulatedMs += delta;

	while (timerState.accumulatedMs >= MS_PER_SECOND && timerState.timerValue > 0) {
		timerState.accumulatedMs -= MS_PER_SECOND;
		timerState.timerValue--;

		if (timerState.timerText) {
			timerState.timerText.setText(timerState.timerValue.toString());
		}

		if (timerState.timerValue <= TIMER_WARNING_THRESHOLD_SECONDS && timerState.timerValue > 0) {
			timerState.timerText?.setVisible(true);
			timerState.timerCircle?.setVisible(true);
		}

		if (timerState.timerValue <= 0) {
			timerState.timerText?.setVisible(false);
			timerState.timerCircle?.setVisible(false);

			timerState.blackHoleState = BlackHole.activateBlackHole(timerState.blackHoleState);
		}
	}

	return timerState;
}

export function stop(timerState: CountdownTimerState): CountdownTimerState {
	if (timerState.timerText) {
		timerState.timerText.destroy();
	}
	if (timerState.timerCircle) {
		timerState.timerCircle.destroy();
	}

	if (timerState.blackHoleState.blackHole) {
		timerState.blackHoleState = BlackHole.deactivateBlackHole(timerState.blackHoleState);
	}

	return {
		...timerState,
		timerText: null,
		timerCircle: null,
	};
}

export function getCircle(timerState: CountdownTimerState): Phaser.GameObjects.Arc | null {
	return timerState.timerCircle;
}
