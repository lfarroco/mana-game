import * as c from "@Constants/constants";
import { clearAll, summon } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Board from "@Models/Board";


export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {

	// Hide enemy board after combat
	Board.setEnemyBoardVisible(false);

	// Re-enable board input after combat
	Board.setIsInputEnabled(true);

	if (shouldResummonUnits) {
		clearAll();
		state.battleData.units = [];
	}

	if (CombatSystemStates.isInitialized()) {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		let newRegenState = RegenSystem.clearRegen(combatStates.regenSystemState, c.FORCE_ID_PLAYER);
		newRegenState = RegenSystem.clearRegen(newRegenState, c.FORCE_ID_CPU);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		let newPoisonState = PoisonSystem.clearPoison(
			combatStates.poisonSystemState,
			c.FORCE_ID_PLAYER
		);
		newPoisonState = PoisonSystem.clearPoison(newPoisonState, c.FORCE_ID_CPU);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);
	}

	if (shouldResummonUnits) {
		const summonPromises = state.session.team.units.map(async (unit, index) => {
			await delay(index * 200);
			await summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}
