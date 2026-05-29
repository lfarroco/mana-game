import * as ResultsUI from "../Results/ResultsUI";

export async function handleGameOverPhase(): Promise<null> {
	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(state, true, undefined, resolve);
		void ResultsUI.slideIn();
	});

	return null;
}
