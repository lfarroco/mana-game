import { State } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";
import { CombatSystemStates } from "./Systems/CombatSystemStates";

const DEFAULT_PROJECTILE_DURATION = 400;
const INSTANT_EFFECT_DURATION = 0;

export type CombatLogEntry = {
	type: string;
	[key: string]: any;
};

export const createServerCombatEffects = (_state: State): CombatEffects & { logs: CombatLogEntry[], setFrame: (f: number) => void } => {
	// Use a fixed time step for server simulation. 
	// This must match the deltaTime used in the server runner (typically 16.67ms)
	const SERVER_DELTA_TIME = 16.67;

	let currentFrame = 0;
	let logs: CombatLogEntry[] = [];

	// Queue for effects that need to be applied after a delay (e.g. projectile travel time)
	const pendingEffects: { frameToExecute: number, action: () => void }[] = [];

	const scheduleEffect = (delayMs: number, action: () => void) => {
		if (delayMs <= 0) {
			action();
		} else {
			const delayFrames = Math.ceil(delayMs / SERVER_DELTA_TIME);
			pendingEffects.push({
				frameToExecute: currentFrame + delayFrames,
				action
			});
		}
	};

	return {
		logs,
		setFrame: (f: number) => {
			currentFrame = f;

			// Process pending effects due on this frame
			// Iterate backwards to allow removal
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

		onChargeBarUpdate: (_unitId: string) => {
		},

		onHasteEnd: (unitId: string) => {
			logs.push({ type: "haste_end", unitId, frame: currentFrame, duration: 0 });
		},

		onSlowEnd: (unitId: string) => {
			logs.push({ type: "slow_end", unitId, frame: currentFrame, duration: 0 });
		},

		onCombatEnd: async (_state: State, outcome: WaveOutcome, _combatStates: CombatSystemStates) => {
			if (_combatStates && _combatStates.combatStatsTrackerState) {
				const { unitStats, currentCombatStats } = _combatStates.combatStatsTrackerState;
				logs.push({
					type: "combat_stats",
					unitStats: Array.from(unitStats.entries()),
					currentCombatStats: Array.from(currentCombatStats.entries()),
					frame: currentFrame
				});
			}
			logs.push({ type: "outcome", result: outcome, frame: currentFrame });
		},

		getTimeScale: () => {
			return 1;
		},

		getScene: () => {
			return null;
		},

		updateLifeDisplay: (force: string, life: number, delta: number, _state?: any) => {
			logs.push({ type: "life_display", force, life, delta, frame: currentFrame, duration: 0 });
		},

		updateShieldDisplay: (force: string, shield: number, delta: number, _state?: any) => {
			logs.push({ type: "shield_display", force, shield, delta, frame: currentFrame, duration: 0 });
		},

		updateRegenDisplay: (force: string, regen: number, delta: number) => {
			logs.push({ type: "regen_display", force, regen, delta, frame: currentFrame, duration: 0 });
		},

		updatePoisonDisplay: (force: string, poison: number, delta: number) => {
			logs.push({ type: "poison_display", force, poison, delta, frame: currentFrame, duration: 0 });
		},

		initBlackHole: () => {
			return {};
		},

		initCountdownTimer: (_blackHoleState: any) => {
			return {};
		},

		initForceStats: () => {
			return {};
		},

		onReactionVisual: async (unitId: string) => {
			logs.push({ type: "reaction", unitId, frame: currentFrame });
		},

		onDamage: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "damage",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onHeal: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "heal",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onShield: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "shield",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onPoison: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "poison",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onRegen: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "regen",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onHaste: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "haste",
				sourceId: _sourceId,
				targetId: _targetId,
				duration: DEFAULT_PROJECTILE_DURATION,
				effectDuration: _duration,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onSlow: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "slow",
				sourceId: _sourceId,
				targetId: _targetId,
				duration: DEFAULT_PROJECTILE_DURATION,
				effectDuration: _duration,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onCharge: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void, delayedExecution?: number) => {
			logs.push({
				type: "charge",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				duration: DEFAULT_PROJECTILE_DURATION,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(DEFAULT_PROJECTILE_DURATION / SERVER_DELTA_TIME)
			});
			scheduleEffect(DEFAULT_PROJECTILE_DURATION, onHit);
		},

		onIncreasePower: (_sourceId: string | undefined, _targetId: string, _amount: number, _permanent: boolean, onHit: () => void, delayedExecution?: number) => {
			const delay = _sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "increase_power",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				permanent: _permanent,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME)
			});
			scheduleEffect(delay, onHit);
		},

		onDecreasePower: (_sourceId: string | undefined, _targetId: string, _amount: number, _permanent: boolean, onHit: () => void, delayedExecution?: number) => {
			const delay = _sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "decrease_power",
				sourceId: _sourceId,
				targetId: _targetId,
				amount: _amount,
				permanent: _permanent,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME)
			});
			scheduleEffect(delay, onHit);
		},

		onIncreaseCritical: (_sourceId: string | undefined, _targetId: string, onHit: () => void, delayedExecution?: number) => {
			const delay = _sourceId ? DEFAULT_PROJECTILE_DURATION : INSTANT_EFFECT_DURATION;
			logs.push({
				type: "increase_critical",
				sourceId: _sourceId,
				targetId: _targetId,
				duration: delay,
				frame: currentFrame,
				delayed: delayedExecution,
				applyTime: currentFrame + Math.ceil(delay / SERVER_DELTA_TIME)
			});
			scheduleEffect(delay, onHit);
		},

		onPowerUpdate: (_unitId: string) => {
		},

		onTimeoutDamageVisual: (targetForceId: string, damage: number, onHit: () => void) => {
			logs.push({ type: "timeout_damage", force: targetForceId, damage, duration: INSTANT_EFFECT_DURATION, frame: currentFrame, applyTime: currentFrame });
			onHit();
		},
	};
};
