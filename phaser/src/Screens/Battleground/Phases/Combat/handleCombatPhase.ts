import * as Board from "@Components/Board/Board";
import * as animation from "@Utils/animation";
import * as Chara from "@Components/Chara/Chara";

import * as CombatPlaybackController from "@Screens/Battleground/Phases/Combat/CombatPlaybackController";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";

import * as ForceStats from "@Screens/Battleground/Components/ForceStats";

import * as Constants from "@game/Constants";
import * as CombatStatsTracker from "@game/Combat/CombatStatsTracker";
import {
	assertCombatStateIndexes,
	rebuildCombatStateIndexes,
} from "@game/Combat/CombatStateIndexes";
import { resetUnitStats } from "@game/Entities/Unit";
import { env } from "@Env";
import { BattlegroundEvent } from "../../../../Events";
import { dispatchAction, type BGContext } from "../../BattlegroundScene";
import * as VictoryUI from "@Screens/Battleground/Components/Results/VictoryUI";
import * as DefeatUI from "@Screens/Battleground/Components/Results/DefeatUI";

const COMBAT_START_DELAY_MS = 300;

// The combat results panel (victory/defeat overlay). Held here so the Continue
// handler can destroy it BEFORE the player's board is re-summoned on the next
// phase; the results phase also tracks it, so the phase controller destroys it
// again on the phase switch (GameObject.destroy() is idempotent).
let resultsPanel: Phaser.GameObjects.Container | null = null;

// The combat phase is split into a playback phase (`combat`) followed by a
// client-only results phase (`combat_victory` / `combat_defeat`).  The playback
// state below is shared across those phases within this module.
type PlaybackState = {
	isPaused: boolean;
	stopActivePlayback: () => void;
	currentController: ReturnType<
		typeof CombatPlaybackController.createCombatPlaybackController
	> | null;
};

const initialState = (): PlaybackState => ({
	isPaused: false,
	stopActivePlayback: () => {},
	currentController: null,
});

let state: PlaybackState = initialState();

// Per-unit combat stats snapshot captured when playback finishes.  The results
// phase reads this to render the stats table.  It is module-scoped because the
// phase switch takes no params; reset when combat is torn down on continue.
// TODO: this should come from the server
let combatStatsSnapshot: CombatStatsTracker.CombatStatsTrackerState | null = null;

/**
 * Drop module-scoped combat playback state. Called by BattlegroundScene's
 * `onScreenShutdown()` so a playback controller from a previous visit cannot
 * leak into the next one.
 *
 * Stops any active playback FIRST: a scene's event emitter is NOT cleared by
 * Phaser on shutdown, so the combat `update` listener must be removed explicitly
 * (otherwise it would keep ticking against the next visit's state).
 */
export function resetCombatPhaseState(): void {
	cleanupPlayback(state);
	state = initialState();
	combatStatsSnapshot = null;
	resultsPanel = null;
}

const handleCombatContinueRequested = async () => {
	const { wins: previousWins, round: previousRound } = env.state.session;

	// The results panel and the combat board are torn down INSIDE the success
	// callback: `dispatchAction` runs it after the server accepted `end_combat`
	// but before the next phase builds, so the ordering against the incoming
	// phase is unchanged. Tearing down *before* the dispatch (as this used to)
	// meant a failed `end_combat` left the results screen without its Continue
	// button — no way to retry the action, only the HUD main menu.
	await dispatchAction({ type: "end_combat" }, async ({ session }) => {
		// Destroy the panel first so it is gone before the player's board is
		// cleared and re-summoned on the next phase transition. The phase
		// controller destroys it again on the phase switch (Phaser's
		// GameObject.destroy() is idempotent, so the second call is a no-op).
		resultsPanel?.destroy();
		resultsPanel = null;

		// Tear down the combat board / ForceStats / combatState before the new
		// phase builds. `phaseFinished.emit` awaits the full next-phase
		// transition, so anything after it would race the new phase's create.
		await teardownCombat();

		const winDelta = session.wins - previousWins;
		if (winDelta !== 0) BattlegroundEvent.winsChanged.emit({ wins: session.wins, delta: winDelta });

		// Lives are synced generically in transitionToCurrentPhase — encounters
		// like soul_trade / rest_inn mutate losses without this combat flow, so
		// the HUD is reconciled from session state on every phase transition.
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
	// Capture the scene up front: the start delay below gives the player a
	// window to navigate away, and the scene's event emitter survives shutdown,
	// so a listener registered on a stale/dying scene would leak.
	const scene = env.scene;

	setupCombatBoard();

	ForceStats.createForceStats();

	await animation.delay(COMBAT_START_DELAY_MS);

	// The player navigated away (or the scene was replaced) while waiting.
	if (!scene.sys?.settings?.active) return () => {};

	const controller = CombatPlaybackController.createCombatPlaybackController(
		env.state.combatState!.logs
	);
	state.currentController = controller;

	// Capture the emitter at registration time: `env.scene` is repointed to the
	// incoming screen on navigation, so removing the listener through it later
	// would target the wrong scene (and leak this handler onto the battleground
	// scene, which Phaser does NOT clear on shutdown).
	const sceneEvents = scene.events;
	const updateHandler = (time: number, delta: number) => {
		if (state.isPaused) return;
		controller.updateFrame(env.state.combatState!, time, delta);
		if (!controller.isActive()) {
			sceneEvents.off("update", updateHandler);
		}
	};

	sceneEvents.on("update", updateHandler);

	return () => {
		sceneEvents.off("update", updateHandler);
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
	// Swap in a fresh clone of the pristine initialUnits for playback, then
	// rebuild the derived indexes so log handlers operate on these units rather
	// than the simulation-mutated ones.
	combatState.units = structuredClone([...combatState.initialUnits]);
	const combatUnits = combatState.units;
	Object.assign(combatState, rebuildCombatStateIndexes(combatState, combatState.playerCore.force));
	assertCombatStateIndexes(combatState);

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
	state.stopActivePlayback = () => {};
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
const renderCombatResults = async (
	ctx: BGContext,
	containerPromise: Promise<Phaser.GameObjects.Container>
): Promise<void> => {
	ctx.listen(ctx.events.combatContinueRequested, handleCombatContinueRequested);
	ctx.listen(ctx.events.combatReplayRequested, () => ctx.go("combat"));

	// Track the panel in the phase scope (so the phase controller destroys it on
	// the phase switch) and keep a reference for the Continue handler, which
	// removes it before the player's board is re-summoned. Returning nothing
	// (instead of the container) avoids double-tracking it.
	const container = await containerPromise;
	resultsPanel = container;
	ctx.track(container);
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
	return renderCombatResults(
		ctx,
		DefeatUI.displayDefeat(-1, combatState.units, combatStatsSnapshot)
	);
};
