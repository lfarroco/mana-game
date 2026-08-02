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
import { dispatchAction } from "../../BattlegroundScreen";
import type { PhaseHandler } from "../../BattlegroundScreen";

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

export const CombatPhase: PhaseHandler = {
	name: "combat",

	async start() {
		// ── All instance state is closure-captured ──
		let isPaused = false;
		let activeCombatState: Models.CombatState | null = null;
		let stopActivePlayback: PlaybackDisposer = () => { };

		// ── Event listeners ──
		const listeners: (() => void)[] = [];

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

		const handleCombatReplayRequested = () => {
			if (env.state.session.phase !== "combat") return;
			void beginCombatPlayback();
		};

		listeners.push(
			BattlegroundEvent.combatContinueRequested.listen(handleCombatContinueRequested),
			BattlegroundEvent.combatReplayRequested.listen(handleCombatReplayRequested),
			BattlegroundEvent.combatPauseRequested.listen(pauseCombat),
			BattlegroundEvent.combatResumeRequested.listen(resumeCombat),
		);

		// ── Validate state ──
		const combatState = env.state.combatState;
		if (!combatState) {
			listeners.forEach((d) => d());
			throw new Error("Missing combatState while entering combat phase");
		}

		activeCombatState = combatState;

		// Mutable ref so the playback-finish listener can reach the controller
		// created inside startCombatPlayback below.
		let currentController: ReturnType<typeof CombatPlaybackController.createCombatPlaybackController> | null = null;

		listeners.push(
			BattlegroundEvent.combatPlaybackFinished.listen(async ({ outcome }) => {
				if (!currentController) return;
				Board.setIsInputEnabled(true);
				lastCombatTrackerState = currentController.getEnv().combatStates.combatStatsTrackerState;
				await showCombatResults({
					resultType: getCombatResultType(outcome),
				});
			}),
		);

		// ── Internal helpers ──
		function cleanupPlayback(): void {
			isPaused = false;
			env.scene.tweens.resumeAll();
			env.scene.time.paused = false;
			stopActivePlayback();
			stopActivePlayback = () => { };
			lastCombatTrackerState = null;
		}

		async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {
			Board.setEnemyBoardVisible(false);
			Board.setIsInputEnabled(true);

			if (shouldResummonUnits) {

				Chara.clearAll();

				const summonPromises = env.state.session.team.units.map(async (unit, index) => {
					await animation.delay(index * 200);
					await Chara.summon(unit, true);
				});

				await Promise.all(summonPromises);

			}
		}

		const getCombatResultType = (outcome: string) =>
			outcome === "player_lost" ? "defeat" : "victory";

		const showCombatResults = async ({ resultType }: { resultType: "defeat" | "victory" }) => {
			void ResultsUI.slideIn();
			await ResultsUI.displayResults(resultType);
		};

		const setupCombatBoard = async (): Promise<void> => {
			Board.setIsInputEnabled(false);
			Board.setEnemyBoardVisible(true);

			namesDisplay.updateNameDisplay({
				enemyName: env.state.combatState!.enemyPlayerName ?? "CPU",
			});

			Chara.clearAll();

			// Use combatState.units (not initialUnits) so that the unit references
			// stored in the chara containers match the same objects that
			// CombatPlaybackController.updateChargeBars mutates when advancing
			// charge/cooldown during playback. This keeps the charge bar display
			// in sync with the live combat state.
			const combatUnits = env.state.combatState!.units;

			const summonPromises = combatUnits.map((unit) => Chara.summon(unit, false));
			await Promise.all(summonPromises);
			combatUnits.forEach(resetUnitStats);
		};

		const startCombatPlayback = async (): Promise<PlaybackDisposer> => {
			await setupCombatBoard();

			ForceStats.createForceStats();

			await animation.delay(COMBAT_START_DELAY_MS);

			const controller = CombatPlaybackController.createCombatPlaybackController(
				env.state.combatState!.logs,
			);
			currentController = controller;

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
			if (!activeCombatState || env.state.session.phase !== "combat") return;
			cleanupPlayback();
			stopActivePlayback = await startCombatPlayback();
		}

		// ── Start playback ──
		await beginCombatPlayback();

		// ── Return teardown ──
		return async () => {
			listeners.forEach((d) => d());

			cleanupPlayback();
			activeCombatState = null;
			env.patchState({ combatState: undefined });
			await resetBoard(true);
			namesDisplay.updateNameDisplay({ enemyName: "" });
			ForceStats.setCombatClientState();
			ForceStats.destroyForceStats(Constants.FORCE_ID_CPU);
			ForceStats.resetPlayerForceStats();
		};
	},
};
