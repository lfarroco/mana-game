import { State } from "@Models/State.js";
import { CombatEffects, WaveOutcome } from "./RunCombatCore.js";
import * as ServerBlackHole from "./ServerBlackHole.js";
import * as ServerCountdownTimer from "./ServerCountdownTimer.js";

export const createServerCombatEffects = (): CombatEffects => {
	return {
		onUnitPop: (_unitId: string) => {
		},

		onChargeBarUpdate: (_unitId: string) => {
		},

		onCombatEnd: async (_state: State, _outcome: WaveOutcome) => {
		},

		getTimeScale: () => {
			return 1.0;
		},

		getScene: () => {
			return null;
		},

		updateLifeDisplay: (_force: string, _life: number, _delta: number) => {
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
	};
};
