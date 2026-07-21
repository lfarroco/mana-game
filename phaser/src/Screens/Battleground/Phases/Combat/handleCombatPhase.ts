import * as Models from "@game/Models";
import * as Board from "@Components/Board/Board";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";

import * as CombatPlaybackController from "@Screens/Battleground/Phases/Combat/CombatPlaybackController";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";

import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

import * as Constants from "@game/Constants";
import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import { resetUnitStats } from "@game/Entities/Unit";
import { completeCombatEncounter } from "../../../../GameController";

// Store the last combat's tracker state for the results UI to read.
// This lives here because it's the combat phase handler's responsibility
// to bridge between the combat simulation and the UI.
let lastCombatTrackerState: CombatStatsTracker.CombatStatsTrackerState | null = null;
export const getLastCombatTrackerState = (): CombatStatsTracker.CombatStatsTrackerState | null =>
	lastCombatTrackerState;

const COMBAT_START_DELAY_MS = 300;

type PlaybackDisposer = () => void;

export type CombatPhaseResult =
	| { type: "completed"; session: Models.SessionData }
	| { type: "cancelled" };

let stopActivePlayback: PlaybackDisposer = () => { };
let activeCombatState: Models.CombatState | null = null;
let isPaused = false;

const pauseCombat = (): void => {
	isPaused = true;
	io.scene.tweens.pauseAll();
	io.scene.time.paused = true;
};

const resumeCombat = (): void => {
	isPaused = false;
	io.scene.tweens.resumeAll();
	io.scene.time.paused = false;
};

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;

	io.screens.battleground.events.phaseFinished.listen(finishCombatPhase);
	io.screens.battleground.events.combatContinueRequested.listen(handleCombatContinueRequested);
	io.screens.battleground.events.combatReplayRequested.listen(handleCombatReplayRequested);
	io.screens.battleground.events.combatPauseRequested.listen(pauseCombat);
	io.screens.battleground.events.combatResumeRequested.listen(resumeCombat);

}

async function finishCombatPhase({ previousPhase }: { previousPhase: Models.PhaseType }): Promise<void> {
	if (previousPhase !== "combat") return;

	cleanupPlayback();
	activeCombatState = null;
	state.combatState = undefined;
	await resetBoard(true);
	namesDisplay.updateNameDisplay({ enemyName: "" });

	// Clean up enemy ForceStats and reset player's to post-combat state
	ForceStats.destroyForceStats(Constants.FORCE_ID_CPU);
	ForceStats.resetPlayerForceStats();

}

function cleanupPlayback(): void {
	isPaused = false;
	io.scene.tweens.resumeAll();
	io.scene.time.paused = false;
	stopActivePlayback();
	stopActivePlayback = () => { };
	lastCombatTrackerState = null;
}

const getInitialCombatUnits = (combatState: Models.CombatState) => {
	if (combatState.initialUnits && combatState.initialUnits.length > 0) {
		return combatState.initialUnits;
	}

	return combatState.units;
};

const getCombatResultType = (outcome: string) =>
	outcome === "player_lost" ? "defeat" : "victory";

const showCombatResults = ({
	resultType,
}: {
	resultType: "defeat" | "victory";
}) => {
	return new Promise<void>((resultHandled) => {
		void ResultsUI.displayResults(
			state,
			resultType,
			() => {
				resultHandled();
				io.screens.battleground.events.combatContinueRequested.emit(undefined);
			},
			() => {
				resultHandled();
				io.screens.battleground.events.combatReplayRequested.emit(undefined);
			}
		);
		void ResultsUI.slideIn();
	});
};

const startCombatPlayback = async ({
	combatState,
}: {
	combatState: Models.CombatState;
}) => {
	await setupCombatBoard(combatState);

	ForceStats.createForceStats();

	await animation.delay(COMBAT_START_DELAY_MS);

	const controller = CombatPlaybackController.createCombatPlaybackController(
		combatState.logs,
		async (outcome) => {
			Board.setIsInputEnabled(true);
			lastCombatTrackerState = controller.getEnv().combatStates.combatStatsTrackerState;
			await showCombatResults({
				resultType: getCombatResultType(outcome),
			});
		}
	);
	const updateHandler = (time: number, delta: number) => {
		if (isPaused) return;
		controller.updateFrame(combatState, time, delta);
		if (!controller.isActive()) {
			io.scene.events.off("update", updateHandler);
		}
	};

	io.scene.events.on("update", updateHandler);

	return () => {
		io.scene.events.off("update", updateHandler);
		controller.stop();
	};
};

async function beginCombatPlayback(): Promise<void> {
	if (!activeCombatState || state.session.phase !== "combat") {
		return;
	}

	cleanupPlayback();
	stopActivePlayback = await startCombatPlayback({
		combatState: activeCombatState,
	});
}

function handleCombatContinueRequested(): void {
	if (state.session.phase !== "combat") {
		return;
	}

	void completeCombatEncounter();
}

function handleCombatReplayRequested(): void {
	if (state.session.phase !== "combat") {
		return;
	}

	void beginCombatPlayback();
}

const setupCombatBoard = async (combatState: Models.CombatState): Promise<void> => {
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	namesDisplay.updateNameDisplay({
		enemyName: combatState.enemyPlayerName ?? "CPU",
	});

	Chara.clearAll();

	const initialCombatUnits = getInitialCombatUnits(combatState);

	const summonPromises = initialCombatUnits.map((unit) => Chara.summon(unit, false));
	await Promise.all(summonPromises);
	initialCombatUnits.forEach(resetUnitStats);
};

export async function handleCombatPhase(): Promise<void> {

	init();

	const combatState = state.combatState;

	if (!combatState) {
		throw new Error("Missing combatState while entering combat phase");
	}

	activeCombatState = combatState;
	await beginCombatPlayback();
}


export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {

	Board.setEnemyBoardVisible(false);

	Board.setIsInputEnabled(true);

	if (shouldResummonUnits) {
		Chara.clearAll();
	}

	if (shouldResummonUnits) {
		const summonPromises = state.session.team.units.map(async (unit, index) => {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}