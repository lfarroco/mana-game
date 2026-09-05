import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import { env } from "@Env";
import { displayGameComplete } from "@Screens/Battleground/Components/Results/GameCompleteUI";

export const GameOverPhase = () => {
	// The end screen stands alone: hide the board slots and clear the unit
	// charas (same pattern as the combat phase entry). No restore needed —
	// leaving here always changes screen, which rebuilds the board.
	Board.setPlayerSlotsVisible(false);
	Chara.clearAll();

	return displayGameComplete(env.state.session.wins, env.state.session.team.units, true);
};
