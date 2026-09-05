import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import { dispatchAction, type BGContext } from "../../BattlegroundScreen";
import { displayGameComplete } from "@Screens/Battleground/Components/Results/GameCompleteUI";
import { env } from "@Env";

export const VictoryPhase = (ctx: BGContext) => {
	ctx.listen(ctx.events.combatContinueRequested, async () => {
		// Infinite-mode continue rebuilds the board: restore the slots hidden
		// below (unit charas re-sync on the phase transition).
		Board.setPlayerSlotsVisible(true);
		await dispatchAction({ type: "victory" });
	});

	// The end screen stands alone: hide the board slots and clear the unit
	// charas (same pattern as the combat phase entry).
	Board.setPlayerSlotsVisible(false);
	Chara.clearAll();

	return displayGameComplete(env.state.session.wins, env.state.session.team.units, false);
};
