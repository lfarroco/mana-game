import * as State from "@Models/State";
import * as RunCombatCore from "@Core/Combat/RunCombatCore";
import * as BrowserCombatEffects from "Client/Screens/Battleground/BrowserCombatEffects";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as serverCombatDemo from "Client/Screens/Battleground/serverCombatDemo";
import * as CombatPlaybackController from "Client/Screens/Battleground/CombatPlaybackController";
import * as Card from "@Models/Entities/Card";
import * as BaseCollection from "@Data/BaseCollection";
import * as Unit from "@Models/Entities/Unit";
import * as ServerCombatEffects from "Client/Screens/Battleground/ServerCombatEffects";
import * as Chara from "@Systems/Chara/Chara";
import * as Board from "@Models/Board";
import * as Logger from "@Utils/Logger";

const logger = Logger.createLogger("RunCombatIO");

const cloneState = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};


Card.registerCollection(BaseCollection.BASE_COLLECTION_DATA);

// Store combat data for replay functionality
let lastCombatLogs: ServerCombatEffects.CombatLogEntry[] | null = null;
let lastCombatInitialUnits: Unit.Unit[] | null = null;
let lastCombatOutcome: RunCombatCore.WaveOutcome | null = null;
let lastCombatState: State.State | null = null;
let lastNextPhaseCallback: (() => Promise<void>) | null = null;

export const runCombatIO = (): RunCombatCore.CombatRunner => {

	const combatResult = serverCombatDemo.runServerSideCombat(cloneState(state));

	// Store combat logs and initial units for replay
	lastCombatLogs = combatResult.logs;
	lastCombatInitialUnits = JSON.parse(JSON.stringify(state.battleData.units));

	state.battleData.units.forEach(Unit.resetUnitStats);

	const effects = BrowserCombatEffects.createBrowserCombatEffects();
	const playbackController = CombatPlaybackController.createCombatPlaybackController(state, combatResult.logs, effects);

	const env = playbackController.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	return playbackController;
};

// Store the last combat result for replay functionality
export const storeCombatResult = (
	outcome: RunCombatCore.WaveOutcome,
	state: State.State,
	nextPhaseCallback: () => Promise<void>
) => {
	lastCombatOutcome = outcome;
	lastCombatState = state;
	lastNextPhaseCallback = nextPhaseCallback;
};

// Replay the last combat with stored logs
export const replayCombat = async (): Promise<void> => {
	if (
		!lastCombatLogs ||
		!lastCombatInitialUnits ||
		!lastCombatOutcome ||
		!lastCombatState ||
		!lastNextPhaseCallback
	) {
		logger.warn("No combat data available for replay");
		return;
	}

	// Clear the board and reset
	Chara.clearAll();
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	// Restore initial units
	state.battleData.units = JSON.parse(JSON.stringify(lastCombatInitialUnits));
	state.battleData.units.forEach(Unit.resetUnitStats);

	// Re-summon all units
	const summonPromises = state.battleData.units.map((u) => Chara.summon(u, false));
	await Promise.all(summonPromises);

	// After replay ends, show the results screen again
	const onReplayEnd = async () => {
		const ResultsUI = await import("./Results/ResultsUI");
		const resultType =
			lastCombatOutcome === "player_lost"
				? "defeat"
				: "victory";

		// Re-display the results with the same callbacks
		ResultsUI.displayResults(lastCombatState!, resultType, lastNextPhaseCallback!, replayCombat);
		await ResultsUI.slideIn();
	};

	// Start combat playback with stored logs, using isReplay=true to prevent state updates
	const effects = BrowserCombatEffects.createBrowserCombatEffects(onReplayEnd);
	const playbackController = CombatPlaybackController.createCombatPlaybackController(state, lastCombatLogs, effects);

	const env = playbackController.getEnv();
	CombatSystemStates.setCombatSystemStates(env.combatStates);

	// TODO: update this, this was the old way
	//scene.combatRunner = playbackController;
};
