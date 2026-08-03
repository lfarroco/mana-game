import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { dispatchAction, type BGContext } from "../../BattlegroundScreen";

export const VictoryPhase = (ctx: BGContext) => {

	ctx.listen(ctx.events.combatContinueRequested, async () => {
		await dispatchAction({ type: "victory" });
	});

	return ResultsUI.displayGameCompleteResults(false, () => {
		void ResultsUI.slideIn();
	});

};
