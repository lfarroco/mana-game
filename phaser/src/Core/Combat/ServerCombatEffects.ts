import { State } from "@Models/State";
import { CombatEffects, WaveOutcome } from "@Core/Combat/CombatTypes";
import { CombatSystemStates } from "@Systems/CombatSystemStates";
import { initializeForceStatsState, type ForceStatsState } from "@Core/Combat/ForceStatsState";

const DEFAULT_PROJECTILE_DURATION = 400;
const INSTANT_EFFECT_DURATION = 0;

export type CombatLogEntry = {
	type: string;
	frame: number;
	duration?: number;
	result?: WaveOutcome;
	sourceId?: string;
	targetId?: string;
	amount?: number;
	effectDuration?: number;
	permanent?: boolean;
	force?: string;
	life?: number;
	shield?: number;
	regen?: number;
	poison?: number;
	delta?: number;
	damage?: number;
	unitId?: string;
	unitStats?: [string, import("@Systems/CombatStatsTracker").UnitCombatStats][];
	currentCombatStats?: [string, import("@Systems/CombatStatsTracker").CurrentCombatStats][];
	delayed?: number;
	applyTime?: number;
};

export const createServerCombatEffects = (
	_state: State
): CombatEffects & { logs: CombatLogEntry[]; setFrame: (f: number) => void } => {
	const SERVER_DELTA_TIME = 16.67;
	let currentFrame = 0;
	const logs: CombatLogEntry[] = [];
	const pendingEffects: { frameToExecute: number; action: () => void }[] = [];

	const scheduleEffect = (delayMs: number, action: () => void) => {
		if (delayMs <= 0) {
			action();
			return;
		}

		const delayFrames = Math.ceil(delayMs / SERVER_DELTA_TIME);
		pendingEffects.push({
			frameToExecute: currentFrame + delayFrames,
			action,
		});
	};

	return {
		logs,
		setFrame: (frame: number) => {
			currentFrame = frame;

			for (let i = pendingEffects.length - 1; i >= 0; i--) {
				if (pendingEffects[i].frameToExecute <= currentFrame) {
					pendingEffects[i].action();
					pendingEffects.splice(i, 1);
				}
			}
		},
		onUnitPop: (unitId: string) => {
			logs.push({ type: "unit_pop", unitId, frame: currentFrame, duration: 0 });
		},
		onChargeBarUpdate: (_unitId: string) => { },
		onHasteEnd: (unitId: string) => {
			logs.push({ type: "haste_end", unitId, frame: currentFrame, duration: 0 });
		},
		onSlowEnd: (unitId: string) => {
			logs.push({ type: "slow_end", unitId, frame: currentFrame, duration: 0 });
		},
		onCombatEnd: async (_combatState: State, outcome: WaveOutcome, combatStates: CombatSystemStates) => {
			if (combatStates?.combatStatsTrackerState) {
				const { unitStats, currentCombatStats } = combatStates.combatStatsTrackerState;
				logs.push({
					type: "combat_stats",
					unitStats: Array.from(unitStats.entries()),
					currentCombatStats: Array.from(currentCombatStats.entries()),
					frame: currentFrame,
				});
			}

			logs.push({ type: "outcome", result: outcome, frame: currentFrame });
		},
		getTimeScale: () => 1,
		getScene: () => null,
		updateLifeDisplay: (force: string, life: number, delta: number, _state?: ForceStatsState) => {
			logs.push({ type: "life_display", force, life, delta, frame: currentFrame, duration: 0 });
		},
		updateShieldDisplay: (
			force: string,
			shield: number,
			delta: number,
			_state?: ForceStatsState
		) => {
			logs.push({ type: "shield_display", force, shield, delta, frame: currentFrame, duration: 0 });
		},
		updateRegenDisplay: (force: string, regen: number, delta: number) => {
			logs.push({ type: "regen_display", force, regen, delta, frame: currentFrame, duration: 0 });
		},
		updatePoisonDisplay: (force: string, poison: number, delta: number) => {
			logs.push({ type: "poison_display", force, poison, delta, frame: currentFrame, duration: 0 });
		},
		initBlackHole: () => null,
		initForceStats: () => initializeForceStatsState(),
		onReactionVisual: async (unitId: string) => {
			logs.push({ type: "reaction", unitId, frame: currentFrame });
		},
		onDamage: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "damage",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onHeal: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "heal",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onShield: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "shield",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onPoison: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "poison",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onRegen: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "regen",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onHaste: (sourceId: string, targetId: string, duration: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "haste",
				sourceId,
				targetId,
				duration: DEFAULT_PROJECTILE_DURATION,
				effectDuration: duration,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onSlow: (sourceId: string, targetId: string, duration: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "slow",
				sourceId,
				targetId,
				duration: DEFAULT_PROJECTILE_DURATION,
				effectDuration: duration,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onCharge: (sourceId: string, targetId: string, amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "charge",
				sourceId,
				targetId,
				amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME),
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},
		onIncreasePower: (
			sourceId: string | undefined,
			targetId: string,
			amount: number,
			permanent: boolean,
			onHit: () => void,
			delayedExecution?: number
		) => {
			const delay = sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "increase_power",
				sourceId,
				targetId,
				amount,
				permanent,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME),
			});
			scheduleEffect(delay, onHit);
		},
		onDecreasePower: (
			sourceId: string | undefined,
			targetId: string,
			amount: number,
			permanent: boolean,
			onHit: () => void,
			delayedExecution?: number
		) => {
			const delay = sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "decrease_power",
				sourceId,
				targetId,
				amount,
				permanent,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME),
			});
			scheduleEffect(delay, onHit);
		},
		onIncreaseCritical: (
			sourceId: string | undefined,
			targetId: string,
			onHit: () => void,
			delayedExecution?: number
		) => {
			const delay = sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "increase_critical",
				sourceId,
				targetId,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME),
			});
			scheduleEffect(delay, onHit);
		},
		onPowerUpdate: (_unitId: string) => { },
		onTimeoutDamageVisual: (targetForceId: string, damage: number, onHit: () => void) => {
			logs.push({
				type: "timeout_damage",
				force: targetForceId,
				damage,
				duration: INSTANT_EFFECT_DURATION,
				frame: currentFrame,
				applyTime: currentFrame,
			});
			onHit();
		},
		onTimeoutStart: () => {
			logs.push({ type: "storm_start", frame: currentFrame });
		},
	};
};