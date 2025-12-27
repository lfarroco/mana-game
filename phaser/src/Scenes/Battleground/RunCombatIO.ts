import { getState } from "@Models/State";
import { runCombat, CombatRunner } from "./RunCombatCore";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";
import * as CombatSystemStates from "./Systems/CombatSystemStates";

export type { WaveOutcome, CombatRunner } from "./RunCombatCore";

export const runCombatIO = (): CombatRunner => {
	const state = getState();
	const effects = createBrowserCombatEffects();
	const runner = runCombat(state, effects);

	// Sync the pure runner state to the global singleton for UI components
	// This maintains backward compatibility for ForceStats, PhaseManager, etc.
	const env = runner.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	return runner;
};
