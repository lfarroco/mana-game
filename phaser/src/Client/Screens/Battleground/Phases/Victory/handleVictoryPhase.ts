import * as GameController from "Client/GameController";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";

export async function handleVictoryPhase() {

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			state,
			false,
			GameController.completeVictory,
			() => {
				resolve();
			}
		);
		void ResultsUI.slideIn();
	});

}
