import type * as CombatLogger from "@game/Combat/CombatLogger";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import { WaveOutcome, CombatSystemStates } from "@game/Models";
import { BlackHoleState } from "../../../../../BlackHoleState";

export type PlaybackState = {
	active: boolean;
	currentTime: number;
	animations: { log: CombatLogger.CombatLogEntry; startTime: number; endTime: number; executed: boolean }[];
	outcome: WaveOutcome | null;
	combatStates: CombatSystemStates;
	blackHoleState?: BlackHoleState;
	countdownTimerState?: CountdownTimer.CountdownTimerState;
};