import * as GameController from "@Core/GameController";
import type { SessionData } from "@Core/Types";
import * as ResultsUI from "../Results/ResultsUI";

export async function handleVictoryPhase(): Promise<SessionData | null> {
	let nextSession: SessionData | null = null;

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
