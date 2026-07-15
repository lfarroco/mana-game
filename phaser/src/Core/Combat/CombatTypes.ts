import type * as State from "@Models/State";
import type * as Unit from "@Models/Entities/Unit";
import type * as CombatSystemStates from "@Systems/CombatSystemStates";
import type * as TriggerSystem from "@TriggerSystem/TriggerSystem";
import type * as BlackHoleState from "@Core/Combat/BlackHoleState";
import type * as CountdownTimer from "@Systems/CountdownTimer";
import type * as ForceStatsState from "@Core/Combat/ForceStatsState";
import type * as CombatLogger from "@Core/Combat/CombatLogger";

export type WaveOutcome = "player_won" | "player_lost" | "both_won";

/**
 * Client-side visual effects called during combat playback.
 *
 * All data capture during combat simulation is done through CombatLogger.
 * This interface is only for visual effects that run during client playback.
 * It is NOT part of CombatEnvironment — it is passed separately to the
 * combat runner and playback controller, keeping the pure-data env clean.
 */
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

	// Client-side visual effects for damage/heal/status - dispatched by CombatPlaybackController from logs
	onDamage?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onHeal?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onShield?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onPoison?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onRegen?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onHaste?: (sourceId: string, targetId: string, duration: number, onHit: () => void, delayedExecution?: number) => void;
	onSlow?: (sourceId: string, targetId: string, duration: number, onHit: () => void, delayedExecution?: number) => void;
	onCharge?: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => void;
	onIncreasePower?: (sourceId: string | undefined, targetId: string, amount: number, permanent: boolean, onHit: () => void, delayedExecution?: number) => void;
	onDecreasePower?: (sourceId: string | undefined, targetId: string, amount: number, permanent: boolean, onHit: () => void, delayedExecution?: number, affectedUnitId?: string) => void;
	onIncreaseCritical?: (sourceId: string | undefined, targetId: string, onHit: () => void, delayedExecution?: number) => void;
	onPowerUpdate?: (unitId: string) => void;
	onTimeoutDamageVisual?: (targetForceId: string, damage: number, onHit: () => void) => void;
	onTimeoutStart?: () => void;

	// Server-side log-only callbacks - used by RunCombatCore to log through CombatLogger
	onHasteEnd?: (unitId: string) => void;
	onSlowEnd?: (unitId: string) => void;
};

/**
 * The pure-data combat environment passed through trigger effects and systems.
 * Contains only state, combat system states, logger, and reaction processing.
 * Visual effects (CombatEffects) are NOT part of this env — they are handled
 * separately by RunCombatCore and CombatPlaybackController.
 */
export type CombatEnvironment = {
	state: State.State;
	combatStates: CombatSystemStates.CombatSystemStates;
	logger: CombatLogger.CombatLogger;
	processReactions: (
		env: CombatEnvironment,
		triggeringUnit: Unit.Unit,
		effect: TriggerSystem.Effect,
		scale?: number
	) => void;
};