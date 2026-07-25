import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import { env } from "@Env";
import type { PhaseHandler } from "../../BattlegroundScreen";

export const GameOverPhase: PhaseHandler = {
	name: "game_over",

	async start() {
		const container = env.scene.add.container();
		// ResultsUI manages its own container internally — we track this
		// empty container to satisfy the container-per-phase convention.

		await new Promise<void>((resolve) => {
			void ResultsUI.displayGameCompleteResults(true, resolve);
			void ResultsUI.slideIn();
		});

		return async () => {
			container.destroy(true);
		};
	},
};
