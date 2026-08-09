import { dispatchAction, type BGContext } from "../../BattlegroundScreen";
import { displayGameComplete } from "@Screens/Battleground/Components/Results/GameCompleteUI";
import { env } from "@Env";

export const VictoryPhase = (ctx: BGContext) => {
	ctx.listen(ctx.events.combatContinueRequested, async () => {
		await dispatchAction({ type: "victory" });
	});

	return displayGameComplete(env.state.session.wins, env.state.session.team.units, false);
};
