import * as BlackHole from "@Screens/Battleground/Components/BlackHole/BlackHole";
import * as BlackHoleState from "@Core/Combat/BlackHoleState";
import * as CountdownTimer from "@Systems/CountdownTimer";

// io is a global provided by the Phaser game bootstrap

export const createInitBlackHoleEffect = () => () => {
	return BlackHole.initBlackHole();
};

export const createInitCountdownTimerEffect = () => (blackHoleState: BlackHoleState.BlackHoleState | null) => {
	if (!blackHoleState) {
		return CountdownTimer.initializeCountdownTimer(io.scene, BlackHole.initBlackHole());
	}
	return CountdownTimer.initializeCountdownTimer(io.scene, blackHoleState);
};

export const createStartCountdownTimerEffect = () => (timerState: CountdownTimer.CountdownTimerState) => {
	return CountdownTimer.start(timerState);
};

export const createStopCountdownTimerEffect = () => (timerState: CountdownTimer.CountdownTimerState) => {
	return CountdownTimer.stop(timerState);
};