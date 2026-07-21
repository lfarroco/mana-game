import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { ClientState } from "@Models/ClientState";

export async function handleGameOverPhase(clientState: ClientState): Promise<null> {
	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(clientState, true, undefined, resolve);
		void ResultsUI.slideIn();
	});

	return null;
}
