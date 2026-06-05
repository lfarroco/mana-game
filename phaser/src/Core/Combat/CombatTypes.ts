import type * as State from "@Models/State";
import type * as Unit from "@Models/Entities/Unit";
import type * as CombatSystemStates from "@Systems/CombatSystemStates";
import type * as TriggerSystem from "@TriggerSystem/TriggerSystem";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import type * as ForceStatsState from "@Core/Combat/ForceStatsState";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

export type CombatEffects = {
	onUnitPop: (unitId: string) => void;
	onChargeBarUpdate: (unitId: string) => void;
	onCombatEnd: (
		state: State.State,
		outcome: WaveOutcome,
		combatStates: CombatSystemStates.CombatSystemStates
	) => Promise<void>;
	getTimeScale: () => number;
	getScene: () => Phaser.Scene | null;
	updateLifeDisplay: (
		force: string,
		life: number,
		delta: number,
		forceStatsState?: ForceStatsState.ForceStatsState
	) => void;
	updateShieldDisplay: (
		force: string,
		shield: number,
		delta: number,
		forceStatsState?: ForceStatsState.ForceStatsState
	) => void;
	updateRegenDisplay: (force: string, regen: number, delta: number) => void;
	updatePoisonDisplay: (force: string, poison: number, delta: number) => void;
	initBlackHole?: () => BlackHoleState.BlackHoleState | null;
	initCountdownTimer?: (blackHoleState: BlackHoleState.BlackHoleState | null) => CountdownTimer.CountdownTimerState;
	startCountdownTimer?: (timerState: CountdownTimer.CountdownTimerState) => CountdownTimer.CountdownTimerState;
	stopCountdownTimer?: (timerState: CountdownTimer.CountdownTimerState) => CountdownTimer.CountdownTimerState;
	initForceStats?: () => ForceStatsState.ForceStatsState;
	onReactionVisual?: (unitId: string) => Promise<void>;
	onDamage?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onHeal?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onShield?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onPoison?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onRegen?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onHaste?: (
		sourceId: string,
		targetId: string,
		duration: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onSlow?: (
		sourceId: string,
		targetId: string,
		duration: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onCharge?: (
		sourceId: string,
		targetId: string,
		amount: number,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onIncreasePower?: (
		sourceId: string | undefined,
		targetId: string,
		amount: number,
		permanent: boolean,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onDecreasePower?: (
		sourceId: string | undefined,
		targetId: string,
		amount: number,
		permanent: boolean,
		onHit: () => void,
		delayedExecution?: number,
		affectedUnitId?: string
	) => void;
	onIncreaseCritical?: (
		sourceId: string | undefined,
		targetId: string,
		onHit: () => void,
		delayedExecution?: number
	) => void;
	onPowerUpdate?: (unitId: string) => void;
	onTimeoutDamageVisual?: (targetForceId: string, damage: number, onHit: () => void) => void;
	onTimeoutStart?: () => void;
	onHasteEnd?: (unitId: string) => void;
	onSlowEnd?: (unitId: string) => void;
};

export type CombatEnvironment = {
	state: State.State;
	combatStates: CombatSystemStates.CombatSystemStates;
	effects: CombatEffects;
	processReactions: (
		env: CombatEnvironment,
		triggeringUnit: Unit.Unit,
		effect: TriggerSystem.Effect,
		scale?: number
	) => void;
};