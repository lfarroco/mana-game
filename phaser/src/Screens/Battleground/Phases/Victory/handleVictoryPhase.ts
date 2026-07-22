import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { advancePhase } from "../../BattlegroundScreen";
import { BattlegroundEvent } from "../../../../Events";

export async function handleVictoryPhase() {

	await new Promise<void>((resolve) => {
		const unlisten = BattlegroundEvent.combatContinueRequested.listen(async () => {
			await advancePhase({ type: "victory" });
		});
		void ResultsUI.displayGameCompleteResults(false, () => {
			unlisten();
			resolve();
		});
		void ResultsUI.slideIn();
	});

	return null;
}
