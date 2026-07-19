import type * as CombatLogger from "@game/CombatLogger";
import * as CombatSystemStates from "@game/CombatSystemStates";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import * as RunCombatCore from "@game/RunCombatCore";

export type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: { log: CombatLogger.CombatLogEntry; startTime: number; endTime: number; executed: boolean }[];
	outcome: RunCombatCore.WaveOutcome | null;
	combatStates: CombatSystemStates.CombatSystemStates;
	blackHoleState?: BlackHoleState.BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};