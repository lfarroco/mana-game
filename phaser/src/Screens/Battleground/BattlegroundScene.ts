/**
 * BattlegroundScene — the main game loop as a raw Phaser scene.
 *
 * The last screen migrated off `@mana/framework` (see `Scenes/ScreenScene.ts`
 * and `docs/scene-migration.md`). Phaser owns the lifecycle: entering the scene
 * builds the persistent layer (background, board, HUD, names) and the active
 * phase; leaving it destroys every game object and tween/timer. Module-level
 * state (the phase controller, combat playback state, the Chara registry) is
 * reset in `onScreenShutdown()` so a second run starts clean.
 *
 * Phases are scene-local state driven by `Scenes/PhaseController` — the
 * framework-free replacement for `createScreen({ phases })`. Each phase handler
 * receives a `BGContext` (`track` / `listen` / `go` / `events`) and everything
 * it returns or tracks is destroyed when the phase ends.
 *
 * `dispatchAction` / `finishPhase` stay module-level: dozens of UI components
 * (shop cards, skip buttons, orbs) dispatch through them and have no scene
 * reference. They delegate to the controller created by the active scene.
 */

import * as Board from "@Components/Board/Board";
import * as Chara from "@Components/Chara/Chara";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Encounter from "./Phases/Encounter/Encounter";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as PhaseTransitions from "./phaseTransitions";
import { env } from "@Env";
import { BattlegroundEvent, GameEvent } from "../../Events";
import { go as navigate } from "@Scenes/AppRouter";
import * as UI from "./Components/UI/UI";
import { syncPlayerBoardUnits } from "./playerBoardSync";
import { ScreenScene } from "@Scenes/ScreenScene";
import {
	createPhaseController,
	type PhaseContext,
	type PhaseController,
	type PhaseEntry,
} from "@Scenes/PhaseController";
import { resetCombatPhaseState } from "./Phases/Combat/handleCombatPhase";

export type BGPhase = Models.PhaseType | "combat_victory" | "combat_defeat";

type BGEvents = typeof BattlegroundEvent;

/** Context handed to every battleground phase handler. */
export type BGContext = PhaseContext<BGPhase, BGEvents>;

/** Phaser scene key — must match the route name (see Scenes/routes.ts). */
export const BATTLEGROUND_SCENE_KEY = "battleground";
/** Probe/event name (`__debug.getScreen()` expects this). */
export const BATTLEGROUND_SCREEN_NAME = "battleground";

/**
 * The live phase controller. `dispatchAction`/`finishPhase` are called from
 * components that have no scene reference, so they reach the active screen's
 * controller through this module-level reference. It is set in `buildScreen()`
 * and cleared in `onScreenShutdown()`.
 */
let controller: PhaseController<BGPhase> | null = null;

/**
 * True while a phase transition (including the pre-exit animation) is in
 * flight. Guards against re-entrant dispatches from double-clicks during the
 * longer interaction window the exit animation creates.
 */
let transitionInFlight = false;

/**
 * Upper bound on how long dispatchAction waits for the outgoing phase's exit
 * animation before proceeding anyway. The exit tween itself is hang-proof
 * (animation.tween resolves even when Phaser kills the tween), but this race
 * guarantees the transitionInFlight lock and the phase switch can never be
 * blocked by a stuck animation — a frozen run (session advances, screen does
 * not) is exactly the player-reported symptom this guards against.
 */
const EXIT_ANIMATION_TIMEOUT_MS = 2000;

const PHASES: Record<BGPhase, PhaseEntry<BGPhase, BGEvents>> = {
	encounter: {
		handler: Encounter.encounterPhase(true),
		transition: PhaseTransitions.slideTransition,
	},
	pre_combat: {
		handler: Encounter.encounterPhase(false),
		transition: PhaseTransitions.slideTransition,
	},
	shop: {
		handler: (ctx) => Phases.ShopPhase(ctx),
		transition: PhaseTransitions.slideTransition,
	},
	orb_shop: {
		handler: Phases.openOrbShop,
		transition: PhaseTransitions.slideTransition,
	},
	upgrade_core: {
		handler: Phases.UpgradeCorePhase,
		transition: PhaseTransitions.slideTransition,
	},
	add_reaction_core: {
		handler: Phases.AddReactionCorePhase,
		transition: PhaseTransitions.slideTransition,
	},
	awaken: {
		handler: Phases.AwakenPhase,
		transition: PhaseTransitions.slideTransition,
	},
	combat: {
		handler: (ctx) => Phases.CombatPhase(ctx),
		transition: PhaseTransitions.slideTransition,
	},
	game_over: {
		handler: Phases.GameOverPhase,
		transition: PhaseTransitions.slideTransition,
	},
	victory: {
		handler: (ctx) => Phases.VictoryPhase(ctx),
		transition: PhaseTransitions.slideTransition,
	},

	// Client-only phases (not present in session.phase)
	combat_victory: {
		handler: (ctx) => Phases.CombatVictoryPhase(ctx),
		transition: PhaseTransitions.slideTransition,
	},
	combat_defeat: {
		handler: (ctx) => Phases.CombatDefeatPhase(ctx),
		transition: PhaseTransitions.slideTransition,
	},
};

/**
 * Dispatch an action, update state, optionally run a callback, then emit phaseFinished.
 * This is the canonical single-step phase transition used by all phase handlers.
 *
 * The outgoing phase's exit animation starts immediately, in parallel with the
 * server dispatch — so the 150-200ms request round-trip (multiplayer) is hidden
 * behind the slide-out instead of showing as a dead pause. The next go() skips
 * the exit since it already ran here.
 *
 * @param action - The game action to dispatch through the server adapter.
 * @param onBeforeFinish - Optional callback that fires after state update but before
 *   phaseFinished is emitted. Use for intermediate events (HUD deltas, purchase events, etc.).
 */
export const dispatchAction = async (
	action: Models.Action,
	onBeforeFinish?: (response: Models.ActionResponse) => void | Promise<void>
): Promise<void> => {
	if (transitionInFlight) return;

	const previousPhase = env.state.session.phase;
	const exitDone = beginPhaseTransition();

	try {
		let response: Models.ActionResponse;
		try {
			response = await env.dispatch(action);
		} catch (err) {
			// The action failed — bring the outgoing phase back into view
			// instead of leaving the board empty.
			await restorePhaseExit().catch(() => {});
			throw err;
		}

		await awaitExitAnimation(exitDone);

		env.updateState({ ...env.state, ...response });
		if (onBeforeFinish) await onBeforeFinish(response);
		await BattlegroundEvent.phaseFinished.emit({ previousPhase });
	} finally {
		endPhaseTransition();
	}
};

/**
 * Lock input and start the current phase's exit animation. The returned
 * promise resolves when the exit finishes. Run this in parallel with a server
 * dispatch so the outgoing UI slides away while the request is in flight.
 */
export const beginPhaseTransition = (): Promise<void> => {
	transitionInFlight = true;
	return controller?.startPhaseExit() ?? Promise.resolve();
};

/** Wait for the exit animation, never hanging past EXIT_ANIMATION_TIMEOUT_MS. */
const awaitExitAnimation = (exitDone: Promise<void>): Promise<void> =>
	Promise.race([
		exitDone,
		new Promise<void>((resolve) => setTimeout(resolve, EXIT_ANIMATION_TIMEOUT_MS)),
	]);

/** Release the transition lock after the phase switch completes. */
export const endPhaseTransition = (): void => {
	transitionInFlight = false;
};

/**
 * Reverse a pending pre-exit (see `beginPhaseTransition`) and bring the current
 * phase's UI back into view. Used when the async work the exit was overlapping
 * with fails; best-effort, never rejects.
 */
export const restorePhaseExit = async (): Promise<void> => {
	await controller?.restorePhaseExit();
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
	onBeforeFinish?: () => void | Promise<void>
): Promise<void> => {
	if (onBeforeFinish) await onBeforeFinish();
	await BattlegroundEvent.phaseFinished.emit({ previousPhase });
};

/**
 * Reconcile the board/HUD with session state, then move to the phase the
 * session is in. Wired to `BattlegroundEvent.phaseFinished`.
 */
const transitionToCurrentPhase = async (): Promise<void> => {
	const { phase } = env.state.session;

	// Always reconcile the board to the session team before moving to the next phase.
	await syncPlayerBoardUnits();

	// Keep the HUD hearts in sync — encounters that spend or restore life
	// (soul_trade, rest_inn, roulette_wheel) mutate losses directly.
	UI.syncLivesDisplay();

	// Keep the HUD round counter in sync — the round advances on phase
	// transitions (e.g. after the upgrade_core → next-round handoff), which
	// is outside the combat-results continue flow.
	UI.syncRoundDisplay();

	await controller?.go(phase);
};

/**
 * Screen-scoped listeners. Disposed in `onScreenShutdown()` — they subscribe to
 * module-level events that outlive the scene.
 */
function wireBattlegroundEvents(): (() => void)[] {
	const evs = BattlegroundEvent;

	return [
		// Character containers are module-level (Chara registry); Phaser
		// destroys the objects, this clears the registry.
		GameEvent.screenHidden.listen(Chara.clearAll),

		evs.phaseFinished.listen(transitionToCurrentPhase),

		evs.newRunRequested.listen(() => {
			env.resetState();
			void navigate("crystals");
		}),

		evs.mainMenuRequested.listen(() => {
			env.resetState();
			void navigate("title");
		}),

		...UI.registerListeners(),
	];
}

export class BattlegroundScene extends ScreenScene {
	private phaseController: PhaseController<BGPhase> | null = null;
	private disposers: (() => void)[] = [];

	constructor() {
		super({ key: BATTLEGROUND_SCENE_KEY }, BATTLEGROUND_SCREEN_NAME);
	}

	protected async buildScreen(): Promise<void> {
		const phaseController = createPhaseController<BGPhase, BGEvents>({
			name: BATTLEGROUND_SCREEN_NAME,
			events: BattlegroundEvent,
			phases: PHASES,
		});
		this.phaseController = phaseController;
		controller = phaseController;

		this.disposers = wireBattlegroundEvents();

		Components.Background.create();
		Components.NamesDisplay.create();
		Components.Board.create();
		Components.DiscardZone.create();
		Components.UI.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		await transitionToCurrentPhase();
	}

	/** Switch phase (used by phase handlers through `ctx.go` and by debug probes). */
	async go(phase: BGPhase): Promise<void> {
		await this.phaseController?.go(phase);
	}

	currentPhase(): BGPhase | null {
		return this.phaseController?.currentPhase() ?? null;
	}

	protected onScreenShutdown(): void {
		this.disposers.forEach((dispose) => dispose());
		this.disposers = [];

		// Drop the module-level controller reference before tearing it down so
		// a late dispatch from a dying component cannot reach it.
		controller = null;
		this.phaseController?.destroy();
		this.phaseController = null;
		transitionInFlight = false;

		// Module-level state Phaser cannot know about. The game objects
		// themselves were already destroyed by Phaser's display-list shutdown;
		// these resets keep the next visit from reusing stale references.
		resetCombatPhaseState();
		Chara.clearAll();
		Board.setIsInputEnabled(true);
		UI.destroy();
	}
}
