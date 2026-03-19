import type * as Phaser from "phaser";
import { State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { CombatSystemStates } from "@Systems/CombatSystemStates";
import { Effect } from "@TriggerSystem/TriggerSystem";
import { BlackHoleState } from "@Scenes/Battleground/BlackHole";
import { CountdownTimerState } from "@Systems/CountdownTimer";
import { ForceStatsState } from "@Scenes/Battleground/ForceStats";

export type WaveOutcome = "player_won" | "player_lost";

export type CombatEffects = {
	onUnitPop: (unitId: string) => void;
	onChargeBarUpdate: (unitId: string) => void;
	onCombatEnd: (
		state: State,
		outcome: WaveOutcome,
		combatStates: CombatSystemStates
	) => Promise<void>;
	getTimeScale: () => number;
	getScene: () => Phaser.Scene | null;
	// Update functions now accept optional state to bypass global lookup
	updateLifeDisplay: (
		force: string,
		life: number,
		delta: number,
		forceStatsState?: ForceStatsState
	) => void;
	updateShieldDisplay: (
		force: string,
		shield: number,
		delta: number,
		forceStatsState?: ForceStatsState
	) => void;
	updateRegenDisplay: (force: string, regen: number, delta: number) => void; // Regen display logic usually simpler, but might need state later? No, currently it just updates chip.
	updatePoisonDisplay: (force: string, poison: number, delta: number) => void;
	initBlackHole?: () => BlackHoleState | null;
	initCountdownTimer?: (blackHoleState: BlackHoleState | null) => CountdownTimerState;
	startCountdownTimer?: (timerState: CountdownTimerState) => CountdownTimerState;
	stopCountdownTimer?: (timerState: CountdownTimerState) => CountdownTimerState;
	initForceStats?: () => ForceStatsState;
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
		delayedExecution?: number
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
	state: State;
	combatStates: CombatSystemStates;
	effects: CombatEffects;
	processReactions: (
		env: CombatEnvironment,
		triggeringUnit: Unit,
		effect: Effect,
		scale?: number
	) => void;
};
