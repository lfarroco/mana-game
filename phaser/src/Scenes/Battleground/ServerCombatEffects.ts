import { State } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";
import { CombatSystemStates } from "./Systems/CombatSystemStates";

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

		onDamage: (_sourceId: string, _targetId: string, onHit: () => void) => {
			logs.push({ type: "damage_effect", source: _sourceId, target: _targetId, frame: currentFrame });
			onHit();
		},

		onHeal: (_sourceId: string, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onShield: (_sourceId: string, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onPoison: (_sourceId: string, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onRegen: (_sourceId: string, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onHaste: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void) => {
			onHit();
		},

		onSlow: (_sourceId: string, _targetId: string, _duration: number, onHit: () => void) => {
			onHit();
		},

		onCharge: (_sourceId: string, _targetId: string, _amount: number, onHit: () => void) => {
			onHit();
		},

		onIncreasePower: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onDecreasePower: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onIncreaseCritical: (_sourceId: string | undefined, _targetId: string, onHit: () => void) => {
			onHit();
		},

		onPowerUpdate: (_unitId: string) => {
		},

		onTimeoutDamageVisual: (targetForceId: string, damage: number, onHit: () => void) => {
			logs.push({ type: "timeout_damage", target: targetForceId, damage, frame: currentFrame });
			onHit();
		},
	};
};
