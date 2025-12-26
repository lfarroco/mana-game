import { State } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";

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
	};
};
