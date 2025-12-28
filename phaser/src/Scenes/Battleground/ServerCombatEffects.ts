import { State } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";
import { CombatSystemStates } from "./Systems/CombatSystemStates";

const DEFAULT_PROJECTILE_DURATION = 400;
const INSTANT_EFFECT_DURATION = 0;

let currentFrame = 0;

export type CombatLogEntry = {
	type: string;
	[key: string]: any;
};

export let logs: CombatLogEntry[] = [];

export const clearLogs = () => {
	logs = [];
	currentFrame = 0;
};

export const createServerCombatEffects = (_state: State): CombatEffects & { logs: CombatLogEntry[], setFrame: (f: number) => void } => {
	return {
		logs,
		setFrame: (f: number) => {
			currentFrame = f;
		},
		onUnitPop: (_unitId: string) => {
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
			logs.push({ type: "outcome", result: outcome, frame: currentFrame });
		},

		getTimeScale: () => {
			return 1;
		},

		getScene: () => {
			return null;
		},

		updateLifeDisplay: (force: string, life: number, _delta: number, _state?: any) => {
			if (life <= 0) {
				logs.push({ type: "crystal_life", force, life, frame: currentFrame });
			}
		},

		updateShieldDisplay: (_force: string, _shield: number, _delta: number, _state?: any) => {
		},

		updateRegenDisplay: (_force: string, _regen: number, _delta: number) => {
		},

		updatePoisonDisplay: (_force: string, _poison: number, _delta: number) => {
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

		onReactionVisual: async (_unitId: string) => {
		},

		onDamage: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "damage", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onHeal: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "heal", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onShield: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "shield", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onPoison: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "poison", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onRegen: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "regen", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onHaste: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void) => {
			logs.push({ type: "haste", sourceId: _sourceId, targetId: _targetId, duration: DEFAULT_PROJECTILE_DURATION, effectDuration: _duration, frame: currentFrame });
			onHit();
		},

		onSlow: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void) => {
			logs.push({ type: "slow", sourceId: _sourceId, targetId: _targetId, duration: DEFAULT_PROJECTILE_DURATION, effectDuration: _duration, frame: currentFrame });
			onHit();
		},

		onCharge: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			logs.push({ type: "charge", sourceId: _sourceId, targetId: _targetId, amount: _amount, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onIncreasePower: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			logs.push({ type: "increase_power", sourceId: _sourceId, targetId: _targetId, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onDecreasePower: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			logs.push({ type: "decrease_power", sourceId: _sourceId, targetId: _targetId, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onIncreaseCritical: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			logs.push({ type: "increase_critical", sourceId: _sourceId, targetId: _targetId, duration: DEFAULT_PROJECTILE_DURATION, frame: currentFrame });
			onHit();
		},

		onPowerUpdate: (_unitId: string) => {
		},

		onTimeoutDamageVisual: (targetForceId: string, damage: number, onHit: () => void) => {
			logs.push({ type: "timeout_damage", force: targetForceId, damage, duration: INSTANT_EFFECT_DURATION, frame: currentFrame });
			onHit();
		},
	};
};
