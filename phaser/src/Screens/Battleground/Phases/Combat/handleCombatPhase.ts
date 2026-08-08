import * as Board from "@Components/Board/Board";
import * as animation from "@Utils/animation";
import * as Chara from "@Components/Chara/Chara";

import * as CombatPlaybackController from "@Screens/Battleground/Phases/Combat/CombatPlaybackController";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";

import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

import * as Constants from "@game/Constants";
import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import { resetUnitStats } from "@game/Entities/Unit";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";
import { dispatchAction, type BGContext } from "../../BattlegroundScreen";
import * as VictoryUI from "@Screens/Battleground/Components/Results/VictoryUI";
import * as DefeatUI from "@Screens/Battleground/Components/Results/DefeatUI";

const COMBAT_START_DELAY_MS = 300;

// The combat phase is split into a playback phase (`combat`) followed by a
// client-only results phase (`combat_victory` / `combat_defeat`).  The playback
// state below is shared across those phases within this module.
type PlaybackState = {
	isPaused: boolean;
	stopActivePlayback: () => void;
	currentController: ReturnType<typeof CombatPlaybackController.createCombatPlaybackController> | null;
};

const initialState = (): PlaybackState => ({
	isPaused: false,
	stopActivePlayback: () => { },
	currentController: null,
});

let state: PlaybackState = initialState();

// Per-unit combat stats snapshot captured when playback finishes.  The results
// phase reads this to render the stats table.  It is module-scoped because the
// framework's go() takes no params; reset when combat is torn down on continue.
// TODO: this should come from the server
let combatStatsSnapshot: CombatStatsTracker.CombatStatsTrackerState | null = null;

const handleCombatContinueRequested = async () => {

	const {
		wins: previousWins,
		losses: previousLosses,
		round: previousRound,
	} = env.state.session;

	// Tear down the combat board / ForceStats / combatState BEFORE dispatching
	// end_combat.  dispatchAction's phaseFinished.emit awaits the full next-phase
	// transition, so any teardown after it would race the new phase's create.
	await teardownCombat();

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


async function beginCombatPlayback(): Promise<void> {

	cleanupPlayback(state);
	state.stopActivePlayback = await startCombatPlayback();
}

const startCombatPlayback = async (): Promise<() => void> => {

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

	const combatState = env.state.combatState!;
	combatState.units = structuredClone(combatState.initialUnits);
	const combatUnits = combatState.units;

	// Rebuild the derived indexes after swapping in the fresh playback units.
	// unitById / playerCore / cpuCore / playerUnits / cpuUnits were built once
	// in createCombatState and still reference the simulation-mutated unit
	// objects. Playback log handlers read/write via unitById, so leaving them
	// stale would apply each log delta on top of the simulation's final values
	// (double-counting power/life — e.g. moss_golem's power jumping to 132).
	const playerForce = combatState.playerCore.force;
	combatState.unitById = new Map(combatUnits.map((u) => [u.id, u]));
	combatState.playerCore = combatUnits.find((u) => u.isCore && u.force === playerForce)!;
	combatState.cpuCore = combatUnits.find((u) => u.isCore && u.force !== playerForce)!;
	combatState.playerUnits = combatUnits.filter((u) => u.force === playerForce);
	combatState.cpuUnits = combatUnits.filter((u) => u.force !== playerForce);

	const charas = combatUnits.map((unit) => Chara.summon(unit, false));
	combatUnits.forEach(resetUnitStats);
	return charas;
};

/**
 * Playback-only teardown: unpause, stop the update handler/controller.  Runs when
 * the combat phase is left (combat -> results) so no playback loop is left hanging.
 * Does NOT touch the board — the frozen battle board must survive into the results
 * phase so the victory/defeat overlay renders on top of it.
 */
const teardownPlayback = (s: PlaybackState): void => {
	cleanupPlayback(s);
	s.currentController = null;
};

/**
 * Full combat teardown: clears the board and ForceStats / the combatState
 * snapshot.  The player's real team is re-summoned by syncPlayerBoardUnits on
 * the next phase transition.  Runs only on Continue (end_combat), NOT on Replay
 * — so the combatState needed to re-run playback stays intact.
 */
const teardownCombat = async (): Promise<void> => {

	cleanupPlayback(state);
	state.currentController = null;
	env.patchState({ combatState: undefined });
	await resetBoard();
	namesDisplay.updateNameDisplay({ enemyName: "" });

	ForceStats.setCombatClientState();
	ForceStats.destroyForceStats(Constants.FORCE_ID_CPU);
	ForceStats.resetPlayerForceStats();
	combatStatsSnapshot = null;
	state = initialState();
};

function cleanupPlayback(state: PlaybackState): void {
	state.isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
	state.stopActivePlayback();
	state.stopActivePlayback = () => { };
}

const pauseCombat = (): void => {
	state.isPaused = true;
	env.scene.tweens.pauseAll();
	env.scene.time.paused = true;
};

const resumeCombat = (): void => {
	state.isPaused = false;
	env.scene.tweens.resumeAll();
	env.scene.time.paused = false;
};

async function resetBoard(): Promise<void> {
	Board.setEnemyBoardVisible(false);
	Board.setIsInputEnabled(true);

	// Clear the board; syncPlayerBoardUnits re-summons the player's team.
	Chara.clearAll();
}

/**
 * `combat` phase — battle playback only.  Listens for pause/resume and, once the

 * playback finishes, captures the stats snapshot and moves to the result phase
 * whose outcome is derived from combatState.wonCombat.  No board teardown here:
 * the frozen battle board must remain visible behind the results overlay.
 */
export const CombatPhase = (ctx: BGContext) => {

	const combatState = env.state.combatState;
	if (!combatState) {
		throw new Error("Missing combatState while entering combat phase");
	}

	ctx.listen(ctx.events.combatPauseRequested, pauseCombat);
	ctx.listen(ctx.events.combatResumeRequested, resumeCombat);
	ctx.listen(ctx.events.combatPlaybackFinished, async () => {
		if (!state.currentController) return;
		Board.setIsInputEnabled(true);
		combatStatsSnapshot = state.currentController.getEnv().combatStates.combatStatsTrackerState;
		await ctx.go(combatState.wonCombat ? "combat_victory" : "combat_defeat");
	});

	beginCombatPlayback();

	// The combat phase owns no visible container on purpose; teardown of the
	// playback loop (not the board) runs when this Destroyable is cleared.
	return [{ destroy: () => teardownPlayback(state) }];
};

/**
 * Builds the results phase's tracked overlay + listeners shared by victory/defeat.
 * Replay re-enters the `combat` phase (which re-runs playback); Continue tears
 * down combat and dispatches end_combat.
 */
const renderCombatResults = (
	ctx: BGContext,
	container: Promise<Phaser.GameObjects.Container>,
): Promise<Phaser.GameObjects.Container> => {
	ctx.listen(ctx.events.combatContinueRequested, handleCombatContinueRequested);
	ctx.listen(ctx.events.combatReplayRequested, () => ctx.go("combat"));
	return container;
};

export const CombatVictoryPhase = (ctx: BGContext) => {
	const combatState = env.state.combatState;
	if (!combatState) {
		throw new Error("Missing combatState while entering combat victory result phase");
	}
	return renderCombatResults(ctx, VictoryUI.displayVictory(combatState.units, combatStatsSnapshot));
};

export const CombatDefeatPhase = (ctx: BGContext) => {
	const combatState = env.state.combatState;
	if (!combatState) {
		throw new Error("Missing combatState while entering combat defeat result phase");
	}
	return renderCombatResults(ctx, DefeatUI.displayDefeat(-1, combatState.units, combatStatsSnapshot));
};


