import { ClientState } from "@Models/ClientState";
import * as GameController from "../../../../GameController";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";

export async function handleVictoryPhase(clientState: ClientState) {

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			clientState,
			false,
			() => GameController.completeVictory(clientState),
			() => {
				resolve();
			}
		);
		void ResultsUI.slideIn();
	});

}
