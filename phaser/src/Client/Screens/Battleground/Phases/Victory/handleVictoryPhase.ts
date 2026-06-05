import * as GameController from "@Core/GameController";
import * as Types from "@Core/Types";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";

export async function handleVictoryPhase(): Promise<Types.SessionData | null> {
	let nextSession: Types.SessionData | null = null;

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			state,
			false,
			async () => {
				nextSession = await GameController.completeVictory();
			},
			() => {
				resolve();
			}
		);
		void ResultsUI.slideIn();
	});

	return nextSession;
}
