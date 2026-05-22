import { BlackHoleState } from "Client/Scenes/Battleground/ServerBlackHole.js";

export type CountdownTimerState = {
	timerValue: number;
	active: boolean;
	blackHoleState: BlackHoleState;
};

export function createServerCountdownTimerState(
	blackHoleState: BlackHoleState
): CountdownTimerState {
	return {
		timerValue: 30,
		active: false,
		blackHoleState,
	};
}

export function startServerCountdownTimer(timerState: CountdownTimerState): CountdownTimerState {
	return {
		...timerState,
		active: true,
	};
}

export function stopServerCountdownTimer(timerState: CountdownTimerState): CountdownTimerState {
	return {
		...timerState,
		active: false,
	};
}
