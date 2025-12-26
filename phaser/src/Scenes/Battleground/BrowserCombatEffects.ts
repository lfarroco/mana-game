import { State, getCurrentScene } from "@Models/State";
import { CombatEffects, WaveOutcome } from "./RunCombatCore";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getBattleCore } from "@Models/Entities/Card";
import { delay } from "@Utils/animation";
import { getCharaById } from "@Systems/Chara/Chara";
import { cpuForce, playerForce } from "@Models/Entities/Force";
import * as Systems from "./Systems";

export const createBrowserCombatEffects = (): CombatEffects => {
	return {
		onUnitPop: (unitId: string) => {
			Animations.pop(unitId);
		},

		onChargeBarUpdate: (unitId: string) => {
			ChargeBarDisplay.updateChargeBar(unitId);
		},

		onCombatEnd: async (state: State, outcome: WaveOutcome) => {
			if (outcome === "player_lost") {
				await Animations.shatter(getCharaById(getBattleCore(state)(playerForce(state).id).id));
			} else {
				await Animations.shatter(getCharaById(getBattleCore(state)(cpuForce(state).id).id));
			}

			await delay(300);

			Systems.ResultsPhase.handleCombatEnded(state, outcome);
		},

		getTimeScale: () => {
			return getCurrentScene().time.timeScale;
		},

		getScene: () => {
			return getCurrentScene();
		},
	};
};
