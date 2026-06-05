import * as BlackHole from "@Screens/Battleground/Components/BlackHole";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import * as constants from "@Constants/constants";

const MS_PER_SECOND = 1000;
const TIMER_TICK_DELAY_MS = 1000;
const TIMER_CIRCLE_DEPTH = 1000;
const TIMER_TEXT_DEPTH = 1001;
const TIMER_WARNING_THRESHOLD_SECONDS = 10;

export type CountdownTimerState = {
	scene: Phaser.Scene;
	timerText: Phaser.GameObjects.Text | null;
	timerCircle: Phaser.GameObjects.Arc | null;
	timerValue: number;
	timerEvent: Phaser.Time.TimerEvent | null;
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
		timerEvent: null,
		blackHoleState,
	};
}

export function start(timerState: CountdownTimerState): CountdownTimerState {
	const newTimerValue = constants.TIMEOUT_DAMAGE_START_TIME / MS_PER_SECOND;

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

	const updateTimer = makeUpdateTimer(timerState, timerText, timerCircle);

	const timerEvent = timerState.scene.time.addEvent({
		delay: TIMER_TICK_DELAY_MS,
		callback: updateTimer,
		callbackScope: null,
		loop: true,
	});

	// Mutate the state object so that the closure in makeUpdateTimer sees the new values
	timerState.timerValue = newTimerValue;
	timerState.timerCircle = timerCircle;
	timerState.timerText = timerText;
	timerState.timerEvent = timerEvent;

	return timerState;
}

function makeUpdateTimer(
	timerState: CountdownTimerState,
	timerText: Phaser.GameObjects.Text,
	timerCircle: Phaser.GameObjects.Arc
) {
	return function updateTimer(): void {
		timerState.timerValue--;
		timerText.setText(timerState.timerValue.toString());
		if (timerState.timerValue <= TIMER_WARNING_THRESHOLD_SECONDS) {
			timerText.setVisible(true);
			timerCircle.setVisible(true);
		}
		if (timerState.timerValue <= 0) {
			timerState.timerEvent?.destroy();
			timerState.timerEvent = null;

			timerText.setVisible(false);
			timerCircle.setVisible(false);

			timerState.blackHoleState = BlackHole.activateBlackHole(timerState.blackHoleState);
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

	if (timerState.blackHoleState.blackHole) {
		timerState.blackHoleState = BlackHole.deactivateBlackHole(timerState.blackHoleState);
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
