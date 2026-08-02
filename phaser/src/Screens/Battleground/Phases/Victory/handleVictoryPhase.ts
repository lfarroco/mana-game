import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { dispatchAction } from "../../BattlegroundScreen";
import { BattlegroundEvent } from "../../../../Events";
import { env } from "@Env";
import type { PhaseHandler } from "../../BattlegroundScreen";

export const VictoryPhase: PhaseHandler = {
	name: "victory",

	async start() {
		const container = env.scene.add.container();

		await new Promise<void>((resolve) => {
			const unlisten = BattlegroundEvent.combatContinueRequested.listen(async () => {
				await dispatchAction({ type: "victory" });
			});
			void ResultsUI.displayGameCompleteResults(false, () => {
				unlisten();
				resolve();
			});
			void ResultsUI.slideIn();
		});

		return async () => {
			container.destroy(true);
		};
	},
};
