import * as Board from "@Components/Board/Board";
import * as Chara from "@Systems/Chara/Chara";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Encounter from "./Phases/Encounter/Encounter";
import * as handleCombatPhase from "./Phases/Combat/handleCombatPhase";

import * as Components from "./Components";
import * as Phases from "./Phases";
import { getRemainingLives } from "../../SessionManager";
import { env } from "@Env";
import { BattlegroundEvent, NavigationEvent } from "../../Events";
import * as UI from "./Components/UI/UI";
import { syncPlayerBoardUnits } from "./playerBoardSync";

// ---------------------------------------------------------------------------
// Phase lifecycle types
// ---------------------------------------------------------------------------

/**
 * A function that tears down a phase instance: destroys all UI, disposes
 * event listeners, and resets internal state. Must be idempotent.
 */
export type TeardownFn = () => Promise<void>;

/**
 * Each phase module exports a PhaseHandler describing how to start and
 * tear down the phase. BattlegroundScreen guarantees that teardown
 * runs on every phase transition AND on screen destruction.
 *
 * Phases should create a dedicated Phaser Container for all their UI
 * so disposal is a single `container.destroy(true)` call.
 */
export type PhaseHandler = {
	name: Models.PhaseType;
	start: () => Promise<TeardownFn>;
};

// ---------------------------------------------------------------------------
// Phase registry
// ---------------------------------------------------------------------------

/**
 * Both "encounter" and "pre_combat" display encounter options — the
 * handler itself checks env.state.session.phase to decide whether to
 * show the skip button.
 */
const EncounterHandler: PhaseHandler = {
	name: "encounter",
	start: Encounter.startPhase,
};

const phaseHandlers: Partial<Record<Models.PhaseType, PhaseHandler>> = {
	encounter: EncounterHandler,
	pre_combat: EncounterHandler,
	combat: handleCombatPhase.CombatPhase,
	shop: Phases.ShopPhase,
	orb_shop: Phases.OrbShopPhase,
	upgrade_core: Phases.UpgradeCorePhase,
	add_reaction_core: Phases.AddReactionCorePhase,
	game_over: Phases.GameOverPhase,
	victory: Phases.VictoryPhase,
};

let activeTeardown: TeardownFn | null = null;

// ---------------------------------------------------------------------------
// Phase advancement helpers
// ---------------------------------------------------------------------------

/**
 * Dispatch an action, update state, optionally run a callback, then emit phaseFinished.
 * This is the canonical single-step phase transition used by all phase handlers.
 *
 * @param action - The game action to dispatch through the server adapter.
 * @param onBeforeFinish - Optional callback that fires after state update but before
 *   phaseFinished is emitted. Use for intermediate events (HUD deltas, purchase events, etc.).
 */
export const advancePhase = async (
	action: Models.Action,
	onBeforeFinish?: (response: Models.ActionResponse) => void | Promise<void>,
): Promise<void> => {
	const previousPhase = env.state.session.phase;
	const response = await env.dispatch(action);
	env.updateState({ ...env.state, ...response });
	if (onBeforeFinish) await onBeforeFinish(response);
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};

/**
 * Emit phaseFinished without dispatching an action.
 * Use when state has already been updated (e.g., dispatch happened earlier in the flow).
 *
 * @param previousPhase - The phase BEFORE state was updated. Must be captured by the
 *   caller before calling updateState, otherwise cleanup listeners will receive the
 *   wrong phase and fail to tear down their UI.
 * @param onBeforeFinish - Optional callback that fires before phaseFinished is emitted.
 */
export const finishPhase = async (
	previousPhase: Models.PhaseType,
	onBeforeFinish?: () => void | Promise<void>,
): Promise<void> => {
	if (onBeforeFinish) await onBeforeFinish();
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};


// ---------------------------------------------------------------------------
// HUD snapshot (track deltas for HUD animations)
// ---------------------------------------------------------------------------

type SessionHudSnapshot = {
	round: number;
	wins: number;
	lives: number;
};

let previousSessionHudSnapshot: SessionHudSnapshot | null = null;

const createSessionHudSnapshot = (): SessionHudSnapshot => ({
	round: env.state.session.round,
	wins: env.state.session.wins,
	lives: getRemainingLives(env.state.session),
});

function updateHudFromSessionChanges(_payload: { previousPhase: Models.PhaseType }): void {
	const currentSnapshot = createSessionHudSnapshot();

	if (!previousSessionHudSnapshot) {
		previousSessionHudSnapshot = currentSnapshot;
		return;
	}

	const winsDelta = currentSnapshot.wins - previousSessionHudSnapshot.wins;
	if (winsDelta !== 0) {
		BattlegroundEvent.winsChanged.emit({ wins: currentSnapshot.wins, delta: winsDelta });
	}

	const livesDelta = currentSnapshot.lives - previousSessionHudSnapshot.lives;
	if (livesDelta !== 0) {
		BattlegroundEvent.livesChanged.emit({ lives: currentSnapshot.lives, delta: livesDelta });
	}

	if (currentSnapshot.round !== previousSessionHudSnapshot.round) {
		BattlegroundEvent.roundChanged.emit({
			round: currentSnapshot.round,
			delta: currentSnapshot.round - previousSessionHudSnapshot.round,
		});
	}

	previousSessionHudSnapshot = currentSnapshot;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let disposers: (() => void)[] = [];

/**
 * Render the battleground screen and kick off the phase loop.
 * Wires event listeners on every entry — destroy() disposes them on exit.
 */
export const create = async () => {
	// Register battleground event listeners on every entry (destroy() disposes them on exit)
	disposers = [
		BattlegroundEvent.phaseFinished.listen(handleCurrentPhase),
		BattlegroundEvent.phaseFinished.listen(updateHudFromSessionChanges),

		BattlegroundEvent.newRunRequested.listen(() => {
			env.resetState();
			void NavigationEvent.toCrystals.emit();
		}),

		BattlegroundEvent.mainMenuRequested.listen(() => {
			env.resetState();
			void NavigationEvent.toTitle.emit();
		}),

		// --- HUD listeners (wins/lives/round display updates) ---
		...UI.registerListeners(),
	];

	// --- Render ---
	Components.create();
	previousSessionHudSnapshot = createSessionHudSnapshot();

	AudioManager.playMusic("music_battlemap_vetruv");

	Tooltip.init();

	// TODO: input enable/disable should be managed at the screen level, not
	// delegated to individual components (Board, Shop, etc.).
	Board.setIsInputEnabled(true);

	// Kick off the phase loop
	handleCurrentPhase({});
};

/**
 * Tear down all event listeners and clean up state.
 * Called when the battleground screen is destroyed.
 */
export function destroy(): void {
	if (activeTeardown) {
		activeTeardown();
		activeTeardown = null;
	}
	disposers.forEach((d) => d());
	disposers = [];
	previousSessionHudSnapshot = null;

	Chara.clearAll();
}

// ---------------------------------------------------------------------------
// Board sync helpers
// ---------------------------------------------------------------------------

async function executePhase(
	phase: Models.PhaseType,
	previousPhase?: Models.PhaseType,
) {

	if (phase !== 'combat' && previousPhase !== 'combat') {
		await syncPlayerBoardUnits();
	}

	// Tear down previous phase — guaranteed on every transition
	if (activeTeardown) {
		await activeTeardown();
		activeTeardown = null;
	}

	const handler = phaseHandlers[phase];
	if (!handler) return;

	activeTeardown = await handler.start();
}

const handleCurrentPhase = async ({ previousPhase }: {
	previousPhase?: Models.PhaseType
}) => {
	await executePhase(env.state.session.phase, previousPhase);
};


