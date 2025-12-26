import { getState } from "@Models/State";
import { runCombat, CombatRunner } from "./RunCombatCore";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";

export type { WaveOutcome, CombatRunner } from "./RunCombatCore";

export const runCombatIO = (): CombatRunner => {
	const state = getState();
	const effects = createBrowserCombatEffects();
	return runCombat(state, effects);
};
