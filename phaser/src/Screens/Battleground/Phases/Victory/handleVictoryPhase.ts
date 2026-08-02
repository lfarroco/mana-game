import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { dispatchAction } from "../../BattlegroundScreen";
import { BattlegroundEvent } from "../../../../Events";

export const VictoryPhase = () => {

	const unlisten = BattlegroundEvent.combatContinueRequested.listen(async () => {
		await dispatchAction({ type: "victory" });
	});

	return ResultsUI.displayGameCompleteResults(false, () => {
		unlisten();
		void ResultsUI.slideIn();
	});

};
