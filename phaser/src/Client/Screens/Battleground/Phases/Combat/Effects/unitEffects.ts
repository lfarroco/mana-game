import * as State from "@Models/State";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as CoreConstants from "@Core/Constants";
import * as Animations from "@Systems/Chara/Animations";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Card from "@Models/Entities/Card";
import * as Unit from "@Models/Entities/Unit";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";

export const createUnitPopEffect = () => (unitId: string) => {
	Animations.pop(unitId);
};

export const createChargeBarUpdateEffect = () => (unitId: string) => {
	ChargeBarDisplay.updateChargeBar(unitId);
};

export const createCombatEndEffect = (onReplayEnd?: () => void) => {
	return async (
		state: State.State,
		outcome: RunCombatCore.WaveOutcome,
		combatStates: CombatSystemStates.CombatSystemStates
	) => {
		if (outcome === "player_lost") {
			const core = Card.getBattleCore(state)(CoreConstants.FORCE_ID_PLAYER);
			if (core) {
				await Animations.shatter(Chara.mustGetCharaById(core.id));
			}
		} else if (outcome === "player_won") {
			const core = Card.getBattleCore(state)(CoreConstants.FORCE_ID_CPU);
			if (core) {
				await Animations.shatter(Chara.mustGetCharaById(core.id));
			}
		}

		await animation.delay(300);

		if (combatStates) {
			let forceStatsState = combatStates.forceStatsState;
			forceStatsState = ForceStats.destroyForceStats(forceStatsState, CoreConstants.FORCE_ID_CPU);
			forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
			CombatSystemStates.updateForceStatsState(forceStatsState);
		}

		// Reset visual state on the battleData player units (charge bars reference these objects)
		state.battleData.units
			.filter((u) => u.force === CoreConstants.FORCE_ID_PLAYER)
			.forEach((u) => {
				Unit.resetUnitStats(u);
				ChargeBarDisplay.updateChargeBar(u.id);
			});

		if (onReplayEnd) {
			// After replay ends, show the results screen again
			await onReplayEnd();
		}
	};
};