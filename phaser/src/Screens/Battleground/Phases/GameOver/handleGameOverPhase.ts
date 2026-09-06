import * as Board from "@Components/Board/Board";
import * as ForceStats from "@Screens/Battleground/Components/ForceStats";
import * as Constants from "@game/Constants";
import { env } from "@Env";
import { displayGameComplete } from "@Screens/Battleground/Components/Results/GameCompleteUI";

export const GameOverPhase = () => {
	// The run is over but the player's final board stays on stage: keep the
	// slots visible (the transition already re-synced the team charas) and
	// drop the ForceStats HUD (life/shield/poison/regen) instead of the board.
	Board.setPlayerSlotsVisible(true);
	ForceStats.destroyForceStats(Constants.FORCE_ID_PLAYER);

	return displayGameComplete(env.state.session.wins, env.state.session.team.units, true);
};
