import * as Board from "@Components/Board/Board";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Encounter from "./Phases/Encounter/Encounter";
import * as handleCombatPhase from "./Phases/Combat/handleCombatPhase";
import * as ShopPhase from "./Phases/Shop/handleShopPhase";
import * as OrbShopPhase from "./Phases/OrbShop/handleOrbShopPhase";

import * as Components from "./Components";
import * as Phases from "./Phases";
import { getRemainingLives } from "../../SessionManager";
import { initialState } from "@Models/ClientState";
import { env } from "@Env";
import { BattlegroundEvent, NavigationEvent } from "../../Events";
import * as UI from "./Components/UI/UI";
import { syncPlayerBoardUnits } from "./playerBoardSync";

// ---------------------------------------------------------------------------
// Phase cleanup registry
// ---------------------------------------------------------------------------

/**
 * Each phase handler that creates UI registers a cleanup function here.
 * On every phase transition, ALL registered cleanups are run sequentially
 * BEFORE the next phase starts. This guarantees that previous-phase UI is
 * fully torn down before new-phase UI renders, eliminating the race
 * condition that exists when cleanup runs in parallel via event listeners.
 */
type PhaseCleanupFn = () => void | Promise<void>;
const phaseCleanupFns: PhaseCleanupFn[] = [];

/** Register a cleanup function to run before the next phase starts. */
export function registerPhaseCleanup(cleanup: PhaseCleanupFn): void {
	phaseCleanupFns.push(cleanup);
}

async function runPhaseCleanup(): Promise<void> {
	const fns = [...phaseCleanupFns];
	phaseCleanupFns.length = 0;
	for (const fn of fns) {
		await fn();
	}
}

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
 * Listeners must already be wired via wireBattlegroundEvents().
 */
export const create = async () => {
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
	disposers.forEach((d) => d());
	disposers = [];
	previousSessionHudSnapshot = null;
}

/**
 * Backward-compatible one-time wiring called from Client.ts at app startup.
 * Wires listeners but does NOT render — rendering happens in create().
 * @deprecated Prefer calling create()/destroy() for full lifecycle management.
 */
export function wireBattlegroundEvents(): void {
	disposers = [
		BattlegroundEvent.phaseFinished.listen(handleCurrentPhase),
		BattlegroundEvent.phaseFinished.listen(updateHudFromSessionChanges),

		BattlegroundEvent.newRunRequested.listen(() => {
			Object.assign(env.state, initialState());
			void NavigationEvent.toCrystals.emit(undefined);
		}),

		BattlegroundEvent.mainMenuRequested.listen(() => {
			Object.assign(env.state, initialState());
			void NavigationEvent.toTitle.emit(undefined);
		}),

		// --- Phase-specific listeners ---
		...UI.registerListeners(),
		...Encounter.registerListeners(),
		...handleCombatPhase.registerListeners(),
		...ShopPhase.registerListeners(),
		...OrbShopPhase.registerListeners(),
	];
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

	switch (phase) {
		case "encounter":
			return await Encounter.displayOptions();

		case "pre_combat":
			return await Encounter.displayOptions();

		case "combat": {
			return await handleCombatPhase.handleCombatPhase();
		}

		case "shop":
			return Phases.handleShopPhase();

		case "upgrade_core":
			return await Phases.handleUpgradeCorePhase();

		case "add_reaction_core":
			return await Phases.handleAddReactionCorePhase();

		case "orb_shop":
			return await Phases.handleOrbShopPhase();

		case "game_over":
			return await Phases.handleGameOverPhase();

		case "victory":
			return await Phases.handleVictoryPhase();

		default:
			((_: never) => { })(phase)
			return null;
	}
}

const handleCurrentPhase = async ({ previousPhase }: {
	previousPhase?: Models.PhaseType
}) => {
	await runPhaseCleanup();
	await executePhase(env.state.session.phase, previousPhase);
};


