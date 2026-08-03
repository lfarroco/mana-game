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
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";
import { BGContext, dispatchAction } from "../../BattlegroundScreen";

// Store the last combat's tracker state for the results UI to read.
// Must remain module-level because CombatStatsTable imports it directly.
let lastCombatTrackerState: CombatStatsTracker.CombatStatsTrackerState | null = null;
export const getLastCombatTrackerState = (): CombatStatsTracker.CombatStatsTrackerState | null =>
	lastCombatTrackerState;

const COMBAT_START_DELAY_MS = 300;

type PlaybackDisposer = () => void;

export type CombatPhaseResult =
	| { type: "completed"; session: Models.SessionData }
	| { type: "cancelled" };

const handleCombatContinueRequested = async () => {
	if (env.state.session.phase !== "combat") return;

	const { wins: previousWins, losses: previousLosses, round: previousRound } = env.state.session;
	await dispatchAction({ type: "end_combat" }, ({ session }) => {
		const winDelta = session.wins - previousWins;
		if (winDelta !== 0)
			BattlegroundEvent.winsChanged.emit({ wins: session.wins, delta: winDelta });

		const lossesDelta = previousLosses - session.losses;
		if (lossesDelta !== 0)
			BattlegroundEvent.livesChanged.emit({ lives: 4 - session.losses, delta: session.losses - previousLosses });

		const roundDelta = previousRound - session.round;
		if (roundDelta !== 0)
			BattlegroundEvent.roundChanged.emit({ round: session.round, delta: roundDelta });
	});
};

const handleCombatReplayRequested = (state: PlaybackState) => () => {
	if (env.state.session.phase !== "combat") return;
	void beginCombatPlayback(state);
};

async function beginCombatPlayback(state: PlaybackState): Promise<void> {
	if (!state.activeCombatState || env.state.session.phase !== "combat") return;
	cleanupPlayback(state);
	state.stopActivePlayback = await startCombatPlayback(state);
}

const startCombatPlayback = async (state: PlaybackState): Promise<PlaybackDisposer> => {

	setupCombatBoard();

	ForceStats.createForceStats();

	await animation.delay(COMBAT_START_DELAY_MS);

	const controller = CombatPlaybackController.createCombatPlaybackController(
		env.state.combatState!.logs,
	);
	state.currentController = controller;

	const updateHandler = (time: number, delta: number) => {
		if (state.isPaused) return;
		controller.updateFrame(env.state.combatState!, time, delta);
		if (!controller.isActive()) {
			env.scene.events.off("update", updateHandler);
		}
	};

	env.scene.events.on("update", updateHandler);

	return () => {
		env.scene.events.off("update", updateHandler);
		controller.stop();
	};
};

const setupCombatBoard = () => {
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	namesDisplay.updateNameDisplay({
		enemyName: env.state.combatState!.enemyPlayerName ?? "CPU",
	});

	Chara.clearAll();

	env.state.combatState!.units = structuredClone(env.state.combatState!.initialUnits);
	const combatUnits = env.state.combatState!.units;

	const charas = combatUnits.map((unit) => Chara.summon(unit, false));
	combatUnits.forEach(resetUnitStats);
	return charas;
};

const showCombatResults = async ({ resultType }: { resultType: "defeat" | "victory" }) => {
	void ResultsUI.slideIn();
	await ResultsUI.displayResults(resultType);
};

function cleanupPlayback(state: PlaybackState): void {
	state.isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
	state.stopActivePlayback();
	state.stopActivePlayback = () => { };
	lastCombatTrackerState = null;
}

type PlaybackState = {
	isPaused: boolean,
	activeCombatState: Models.CombatState | null,
	stopActivePlayback: PlaybackDisposer,
	currentController: ReturnType<typeof CombatPlaybackController.createCombatPlaybackController> | null,
	listeners: (() => void)[],
}
const pauseCombat = (state: PlaybackState) => (): void => {
	state.isPaused = true;
	env.scene.tweens.pauseAll();
	env.scene.time.paused = true;
};

const resumeCombat = (state: PlaybackState) => (): void => {
	state.isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
};

async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
	Board.setEnemyBoardVisible(false);
	Board.setIsInputEnabled(true);

	if (!shouldResummonUnits) return;

	Chara.clearAll();

	const summonPromises = env.state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});

	await Promise.all(summonPromises);

}

const cleanup = async (state: PlaybackState) => {
	state.listeners.forEach((d) => d());

	cleanupPlayback(state);
	state.activeCombatState = null;
	env.patchState({ combatState: undefined });
	await resetBoard(true);
	namesDisplay.updateNameDisplay({ enemyName: "" });
	ForceStats.setCombatClientState();
	ForceStats.destroyForceStats(Constants.FORCE_ID_CPU);
	ForceStats.resetPlayerForceStats();
}

export const CombatPhase = (ctx: BGContext) => {

	console.log("...", ctx)

	const state: PlaybackState = {
		isPaused: false,
		activeCombatState: null,
		stopActivePlayback: () => { },
		currentController: null,
		listeners: [],
	}

	state.listeners.push(
		BattlegroundEvent.combatContinueRequested.listen(handleCombatContinueRequested),
		BattlegroundEvent.combatReplayRequested.listen(handleCombatReplayRequested(state)),
		BattlegroundEvent.combatPauseRequested.listen(pauseCombat(state)),
		BattlegroundEvent.combatResumeRequested.listen(resumeCombat(state)),
	);

	const combatState = env.state.combatState;
	if (!combatState) {
		state.listeners.forEach((d) => d());
		throw new Error("Missing combatState while entering combat phase");
	}

	state.activeCombatState = combatState;

	// Mutable ref so the playback-finish listener can reach the controller
	// created inside startCombatPlayback below.

	state.listeners.push(
		BattlegroundEvent.combatPlaybackFinished.listen(async ({ outcome }) => {
			if (!state.currentController) return;
			Board.setIsInputEnabled(true);
			lastCombatTrackerState = state.currentController.getEnv().combatStates.combatStatsTrackerState;
			await showCombatResults({
				resultType: getCombatResultType(outcome),
			});
		}),
	);

	const getCombatResultType = (outcome: string) =>
		outcome === "player_lost" ? "defeat" : "victory";


	beginCombatPlayback(state);

	const container = env.container();

	container.once("destroy", cleanup);

	return [container]
};
