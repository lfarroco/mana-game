import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

export async function handleVictoryPhase() {

	await new Promise<void>((resolve) => {
		void ResultsUI.displayGameCompleteResults(
			false,
			async () => {
				const previousPhase = env.state.session.phase;
				const { session } = await env.dispatch({ type: "victory" });
				env.updateState({ ...env.state, session });
				BattlegroundEvent.phaseFinished.emit({ previousPhase });
			},
			resolve
		);
		void ResultsUI.slideIn();
	});

}
