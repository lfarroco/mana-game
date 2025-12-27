import { State } from "@Models/State.js";
import { CombatEffects, WaveOutcome } from "./RunCombatCore.js";
import * as ServerBlackHole from "./ServerBlackHole.js";
import * as ServerCountdownTimer from "./ServerCountdownTimer.js";

export type LogEntry =
	| { type: "reaction"; unitId: string; frame: number }
	| { type: "damage"; sourceId: string; targetId: string; frame: number }
	| { type: "heal"; sourceId: string; targetId: string; frame: number }
	| { type: "shield"; sourceId: string; targetId: string; frame: number }
	| { type: "poison"; sourceId: string; targetId: string; frame: number }
	| { type: "regen"; sourceId: string; targetId: string; frame: number }
	| { type: "crystal_life"; force: string; life: number; frame: number }
	| { type: "timeout_damage"; force: string; damage: number; frame: number }
	| { type: "outcome"; result: WaveOutcome; frame: number };

export interface ServerCombatEffects extends CombatEffects {
	logs: LogEntry[];
	setFrame: (frame: number) => void;
}

export const createServerCombatEffects = (state: State): ServerCombatEffects => {
	const logs: LogEntry[] = [];
	let currentFrame = 0;

	const resolveUnitName = (unitId: string): string => {
		const unit = state.battleData.units.find(u => u.id === unitId);
		if (unit) {
			return `(${unit.force})${unit.cardId}`;
		}
		// Fallback for core or if unit not found (dead?)
		return unitId;
	};

	return {
		logs,
		setFrame: (frame: number) => {
			currentFrame = frame;
		},
		onUnitPop: (_unitId: string) => {
			// User requested to remove unit action logs
		},

		onChargeBarUpdate: (_unitId: string) => {
		},

		onCombatEnd: async (_state: State, outcome: WaveOutcome) => {
			logs.push({ type: "outcome", result: outcome, frame: currentFrame });
		},

		getTimeScale: () => {
			return 1.0;
		},

		getScene: () => {
			return null;
		},

		updateLifeDisplay: (force: string, life: number, _delta: number) => {
			if (life <= 0) {
				logs.push({ type: "crystal_life", force, life, frame: currentFrame });
			}
		},

		updateShieldDisplay: (_force: string, _shield: number, _delta: number) => {
		},

		updateRegenDisplay: (_force: string, _regen: number, _delta: number) => {
		},

		updatePoisonDisplay: (_force: string, _poison: number, _delta: number) => {
		},

		initBlackHole: () => {
			return ServerBlackHole.createServerBlackHoleState();
		},

		initCountdownTimer: (blackHoleState: any) => {
			return ServerCountdownTimer.createServerCountdownTimerState(blackHoleState);
		},

		onReactionVisual: async (unitId: string) => {
			logs.push({ type: "reaction", unitId: resolveUnitName(unitId), frame: currentFrame });
		},

		onDamage: (sourceId: string, targetId: string, onHit: () => void) => {
			logs.push({ type: "damage", sourceId: resolveUnitName(sourceId), targetId: resolveUnitName(targetId), frame: currentFrame });
			onHit();
		},

		onHeal: (sourceId: string, targetId: string, onHit: () => void) => {
			logs.push({ type: "heal", sourceId: resolveUnitName(sourceId), targetId: resolveUnitName(targetId), frame: currentFrame });
			onHit();
		},

		onShield: (sourceId: string, targetId: string, onHit: () => void) => {
			logs.push({ type: "shield", sourceId: resolveUnitName(sourceId), targetId: resolveUnitName(targetId), frame: currentFrame });
			onHit();
		},

		onPoison: (sourceId: string, targetId: string, onHit: () => void) => {
			logs.push({ type: "poison", sourceId: resolveUnitName(sourceId), targetId: resolveUnitName(targetId), frame: currentFrame });
			onHit();
		},

		onRegen: (sourceId: string, targetId: string, onHit: () => void) => {
			logs.push({ type: "regen", sourceId: resolveUnitName(sourceId), targetId: resolveUnitName(targetId), frame: currentFrame });
			onHit();
		},

		onTimeoutDamageVisual: (targetForceId: string, damage: number, onHit: () => void) => {
			logs.push({ type: "timeout_damage", force: targetForceId, damage, frame: currentFrame });
			onHit();
		}
	};
};
