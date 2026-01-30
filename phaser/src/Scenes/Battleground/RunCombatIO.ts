import { getState, State } from "@Models/State";
import { CombatRunner, WaveOutcome } from "./RunCombatCore";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import { runServerSideCombat } from "./serverCombatDemo";
import { createCombatPlaybackController } from "./CombatPlaybackController";
import { registerCollection } from "@Models/Entities/Card";
import { BASE_COLLECTION_DATA } from "../../Data/BaseCollection";
import { resetUnitStats, Unit } from "@Models/Entities/Unit";
import { CombatLogEntry } from "./ServerCombatEffects";
import * as Chara from "@Systems/Chara/Chara";
import * as Board from "@Models/Board";
import { getCurrentScene } from "@Models/State";
import { BattlegroundScene } from "./BattlegroundScene";

export type { WaveOutcome, CombatRunner } from "./RunCombatCore";

registerCollection(BASE_COLLECTION_DATA);

// Store combat data for replay functionality
let lastCombatLogs: CombatLogEntry[] | null = null;
let lastCombatInitialUnits: Unit[] | null = null;
let lastCombatOutcome: WaveOutcome | null = null;
let lastCombatState: State | null = null;
let lastNextPhaseCallback: (() => Promise<void>) | null = null;

export const runCombatIO = (): CombatRunner => {
	const state = getState();

	const combatResult = runServerSideCombat(state);

	// Store combat logs and initial units for replay
	lastCombatLogs = combatResult.logs;
	lastCombatInitialUnits = JSON.parse(JSON.stringify(state.battleData.units));

	state.battleData.units.forEach(resetUnitStats);

	const effects = createBrowserCombatEffects();
	const playbackController = createCombatPlaybackController(state, combatResult.logs, effects);

	const env = playbackController.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	return playbackController;
};

// Store the last combat result for replay functionality
export const storeCombatResult = (outcome: WaveOutcome, state: State, nextPhaseCallback: () => Promise<void>) => {
	lastCombatOutcome = outcome;
	lastCombatState = state;
	lastNextPhaseCallback = nextPhaseCallback;
};

// Replay the last combat with stored logs
export const replayCombat = async (): Promise<void> => {
	if (!lastCombatLogs || !lastCombatInitialUnits || !lastCombatOutcome || !lastCombatState || !lastNextPhaseCallback) {
		console.warn("No combat data available for replay");
		return;
	}

	const state = getState();
	const scene = getCurrentScene() as BattlegroundScene;

	// Clear the board and reset
	Chara.clearAll();
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	// Restore initial units
	state.battleData.units = JSON.parse(JSON.stringify(lastCombatInitialUnits));
	state.battleData.units.forEach(resetUnitStats);

	// Re-summon all units
	const summonPromises = state.battleData.units.map((u) => Chara.summon(u, false));
	await Promise.all(summonPromises);

	// After replay ends, show the results screen again
	const onReplayEnd = async () => {
		const ResultsUI = await import("./Results/ResultsUI");
		const resultType = lastCombatOutcome === "player_won" ? "victory" : "defeat";

		// Re-display the results with the same callbacks
		ResultsUI.displayResults(
			lastCombatState!,
			resultType,
			lastNextPhaseCallback!,
			replayCombat
		);
		await ResultsUI.slideIn();
	};

	// Start combat playback with stored logs, using isReplay=true to prevent state updates
	const effects = createBrowserCombatEffects(true, onReplayEnd);
	const playbackController = createCombatPlaybackController(state, lastCombatLogs, effects);

	const env = playbackController.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	scene.combatRunner = playbackController;
};
