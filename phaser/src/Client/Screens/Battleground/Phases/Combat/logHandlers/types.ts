import type * as CombatLogger from "@game/Combat/CombatLogger";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import { WaveOutcome } from "@game/Models";
import { CombatSystemStates } from "@game/Combat/CombatSystemStates";

export type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: { log: CombatLogger.CombatLogEntry; startTime: number; endTime: number; executed: boolean }[];
	outcome: WaveOutcome | null;
	combatStates: CombatSystemStates;
	blackHoleState?: BlackHoleState.BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};