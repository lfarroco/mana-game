import { getState } from "@Models/State";
import { CombatRunner } from "./RunCombatCore";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import { runServerSideCombat } from "./serverCombatDemo";
import { createCombatPlaybackController } from "./CombatPlaybackController";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "../../Data/BaseCollection";
import { resetUnitStats } from "@Models/Entities/Unit";

export type { WaveOutcome, CombatRunner } from "./RunCombatCore";

registerCollection(BASE_COLLECTION_DATA);

export const runCombatIO = (): CombatRunner => {
	const state = getState();

	const combatResult = runServerSideCombat(state);

	state.battleData.units.forEach(resetUnitStats);

	const effects = createBrowserCombatEffects();
	const playbackController = createCombatPlaybackController(state, combatResult.logs, effects);

	const env = playbackController.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	return playbackController;
};
