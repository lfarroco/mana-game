import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { advancePhase } from "../../BattlegroundScreen";

export async function handleVictoryPhase() {

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			false,
			async () => {
				await advancePhase({ type: "victory" });
			},
			resolve
		);
		void ResultsUI.slideIn();
	});

}
