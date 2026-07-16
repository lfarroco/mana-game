import * as CombatLogger from "@Core/Combat/CombatLogger";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";

export type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: { log: CombatLogger.CombatLogEntry; startTime: number; endTime: number; executed: boolean }[];
	outcome: RunCombatCore.WaveOutcome | null;
	combatStates: CombatSystemStates.CombatSystemStates;
	blackHoleState?: BlackHoleState.BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};

export type LogHandler = (log: CombatLogger.CombatLogEntry, playbackState: PlaybackState) => void;