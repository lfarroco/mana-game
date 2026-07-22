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
import { advancePhase } from "../../BattlegroundScreen";

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
	env.scene.tweens.pauseAll();
	env.scene.time.paused = true;
};

const resumeCombat = (): void => {
	isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
};

export function registerListeners(): (() => void)[] {
	return [
		BattlegroundEvent.phaseFinished.listen(finishCombatPhase),
		BattlegroundEvent.combatContinueRequested.listen(handleCombatContinueRequested),
		BattlegroundEvent.combatReplayRequested.listen(handleCombatReplayRequested()),
		BattlegroundEvent.combatPauseRequested.listen(pauseCombat),
		BattlegroundEvent.combatResumeRequested.listen(resumeCombat),
	];
}

const finishCombatPhase = async ({ previousPhase }: {
	previousPhase: Models.PhaseType
}): Promise<void> => {
	if (previousPhase !== "combat") return;

	cleanupPlayback();
	activeCombatState = null;
	env.state.combatState = undefined;
	await resetBoard(true);
	namesDisplay.updateNameDisplay({ enemyName: "" });

	// Clean up enemy ForceStats and reset player's to post-combat state
	ForceStats.setCombatClientState();
	ForceStats.destroyForceStats(Constants.FORCE_ID_CPU);
	ForceStats.resetPlayerForceStats();

}

function cleanupPlayback(): void {
	isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
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
			resultType,
			() => {
				resultHandled();
				BattlegroundEvent.combatContinueRequested.emit(undefined);
			},
			() => {
				resultHandled();
				BattlegroundEvent.combatReplayRequested.emit(undefined);
			}
		);
		void ResultsUI.slideIn();
	});
};

const startCombatPlayback = async () => {
	await setupCombatBoard();

	ForceStats.createForceStats();

	await animation.delay(COMBAT_START_DELAY_MS);

	const controller = CombatPlaybackController.createCombatPlaybackController(
		env.state.combatState!.logs,
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

async function beginCombatPlayback(): Promise<void> {
	if (!activeCombatState || env.state.session.phase !== "combat") {
		return;
	}

	cleanupPlayback();
	stopActivePlayback = await startCombatPlayback();
}

function handleCombatContinueRequested(): void {
	if (env.state.session.phase !== "combat") {
		return;
	}

	void (async () => {
		const { wins: previousWins, losses: previousLosses, round: previousRound } = env.state.session;
		await advancePhase({ type: "end_combat" }, ({ session }) => {
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
	})();
}

const handleCombatReplayRequested = () => () => {
	if (env.state.session.phase !== "combat") {
		return;
	}

	void beginCombatPlayback();
}

const setupCombatBoard = async (): Promise<void> => {
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	namesDisplay.updateNameDisplay({
		enemyName: env.state.combatState!.enemyPlayerName ?? "CPU",
	});

	Chara.clearAll();

	const initialCombatUnits = getInitialCombatUnits(env.state.combatState!);

	const summonPromises = initialCombatUnits.map((unit) => Chara.summon(unit, false));
	await Promise.all(summonPromises);
	initialCombatUnits.forEach(resetUnitStats);
};

export async function handleCombatPhase(): Promise<void> {

	const combatState = env.state.combatState;

	if (!combatState) {
		throw new Error("Missing combatState while entering combat phase");
	}

	activeCombatState = combatState;
	await beginCombatPlayback();
}


export async function resetBoard(
	shouldResummonUnits: boolean = true,
): Promise<void> {

	Board.setEnemyBoardVisible(false);

	Board.setIsInputEnabled(true);

	if (shouldResummonUnits) {
		Chara.clearAll();
	}

	if (shouldResummonUnits) {
		const summonPromises = env.state.session.team.units.map(async (unit, index) => {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}