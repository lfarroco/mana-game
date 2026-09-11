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
import * as Constants from "@Constants";
import * as Models from "@game/Models";
import * as Modal from "@Components/Modal/Modal";
import * as AudioManager from "@Systems/AudioManager";
import * as UIButton from "@Components/Button/UIButton";
import * as Encounter from "./Phases/Encounter/Encounter";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as PhaseTransitions from "./phaseTransitions";
import { authSession } from "@lib/authSession";
import { env } from "@Env";
import * as i18n from "@i18n/i18n";
import { BattlegroundEvent, GameEvent } from "../../Events";
import { RemoteServerError } from "../../RemoteServer";
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

/**
 * Phases that exist only in the client — pure view states that are never
 * written to `session.phase`: the combat results overlays.
 */
export const CLIENT_ONLY_PHASES = ["combat_victory", "combat_defeat"] as const;

export type BGPhase = Models.PhaseType | (typeof CLIENT_ONLY_PHASES)[number];

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

/**
 * Every phase the client can render. Exported so a test can assert it covers
 * every phase core can put a session in — an undeclared phase makes
 * `PhaseController.go()` warn and return, leaving the session advanced and the
 * board frozen (the "pick an option, nothing happens" symptom an out-of-date
 * client shows against a newer server).
 */
export const PHASES: Record<BGPhase, PhaseEntry<BGPhase, BGEvents>> = {
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
 * True while the battleground is the screen rendering. `env.scene` is repointed
 * on navigation, so a late failure must not paint UI onto another screen.
 */
function isBattlegroundActive(): boolean {
	const activeScene = env.scene as unknown as { screenName?: string } | undefined;
	return activeScene?.screenName === BATTLEGROUND_SCREEN_NAME;
}

/**
 * Guards against stacking recovery modals when several failures land at once.
 * Reset by `onScreenShutdown()` — the modal itself is destroyed by Phaser with
 * the rest of the scene.
 */
let failurePromptOpen = false;

/**
 * Show a one-button modal that explains a failure the player cannot retry out
 * of. The action navigates away, so the scene (and this modal) is torn down by
 * Phaser; the button therefore calls `onAction` directly instead of awaiting a
 * close animation that navigation would interrupt.
 */
function showRecoveryModal(spec: {
	title: string;
	body: string;
	action: string;
	onAction: () => void;
}): void {
	if (failurePromptOpen || !isBattlegroundActive()) return;
	failurePromptOpen = true;

	const modal = Modal.createModal({ width: 640, height: 360, title: spec.title });
	const body = env.scene.add
		.text(0, -30, spec.body, {
			...Constants.defaultTextConfig,
			fontSize: "22px",
			color: "#ffffff",
			align: "center",
			wordWrap: { width: 560 },
		})
		.setOrigin(0.5);
	const button = UIButton.create({
		text: spec.action,
		position: [0, 120],
		width: 320,
		callback: spec.onAction,
	});
	modal.container.add([body, button.container]);
}

/**
 * True for a rejected request carrying HTTP 401 — the persisted bearer token is
 * missing, unknown or expired (30-day TTL, no refresh token).
 */
export function isAuthExpired(err: unknown): boolean {
	return err instanceof RemoteServerError && err.status === 401;
}

/**
 * Report a failed action to the player and the console.
 *
 * A rejected dispatch used to be swallowed by the component that fired it
 * (fire-and-forget `dispatchAction(...)`, event-listener async handlers), so a
 * single failure — an expired multiplayer token, a dropped request, a malformed
 * session — left the board showing a phase that could no longer react: the exit
 * animation was restored but the per-phase click guard had already latched, and
 * nothing was shown. The player's only symptom was "I pick an option and the
 * game never advances".
 *
 * Three shapes get different treatment:
 *   - 401 → the run is intact server-side, so drop the dead credential and send
 *     the player back through login (the lobby then offers RESUME);
 *   - anything else → a toast: the phase was restored, so a retry is meaningful.
 */
export function reportActionFailure(err: unknown): void {
	const detail = err instanceof Error ? err.message : String(err);
	// console.error keeps the real cause (status code, server message) in
	// player logs — the modal/toast text is deliberately generic.
	console.error(`[BattlegroundScene] action dispatch failed: ${detail}`, err);

	if (isAuthExpired(err)) {
		promptReauth();
		return;
	}

	if (!isBattlegroundActive()) return;
	void UI.handleUserMessageRequested({
		text: i18n.t("battleground.actionFailed"),
		type: "error",
	});
}

/**
 * Expired multiplayer session: clear the dead bearer token and bounce to the
 * login screen. The server owns the run, so re-authenticating restores it —
 * the lobby shows RESUME and the player picks up where they left off.
 *
 * Client state is reset on the way out: leaving the dead *multiplayer* session
 * in `env.state` would leak its `session_type` into the next entry point (a
 * single-player new run would then be routed to the remote server). This is the
 * same reset every other exit from the battleground performs.
 */
function promptReauth(): void {
	const leave = () => {
		authSession.clearSession();
		env.resetState();
		void navigate("multiplayer_login");
	};

	// A late 401 can land after the player navigated away: there is no UI to
	// show, so just drop the dead session.
	if (!isBattlegroundActive()) {
		leave();
		return;
	}

	showRecoveryModal({
		title: i18n.t("battleground.sessionExpiredTitle"),
		body: i18n.t("battleground.sessionExpired"),
		action: i18n.t("battleground.sessionExpiredAction"),
		onAction: leave,
	});
}

/**
 * A phase this build cannot render — a session produced by a newer server
 * (server-authoritative multiplayer deploys before clients update). The phase
 * controller used to only `console.warn`, leaving the board blank with the
 * session already advanced; tell the player why and offer the main menu, since
 * nothing in this build can advance the run.
 */
export function reportUnknownPhase(phase: string): void {
	console.error(
		`[BattlegroundScene] no handler for phase "${phase}" — this build cannot render the run`
	);

	showRecoveryModal({
		title: i18n.t("battleground.unsupportedTitle"),
		body: i18n.t("battleground.unsupported"),
		action: i18n.t("battleground.unsupportedAction"),
		// Reuse the main-menu path (reset state + title) rather than navigating
		// directly, so the run is not left half-torn-down behind the scenes.
		onAction: () => void BattlegroundEvent.mainMenuRequested.emit(),
	});
}

/** Drop the failure-prompt guard (scene shutdown); Phaser destroys the modal. */
export function resetActionFailureState(): void {
	failurePromptOpen = false;
}

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
 * @returns `true` when the action was applied and the phase switch ran; `false`
 *   when the dispatch failed and the outgoing phase was restored. Callers that
 *   latch input (e.g. an "already resolving" flag) must release it on `false`
 *   so the player can retry — a latched flag with a restored UI is a soft-lock.
 */
export const dispatchAction = async (
	action: Models.Action,
	onBeforeFinish?: (response: Models.ActionResponse) => void | Promise<void>
): Promise<boolean> => {
	if (transitionInFlight) return false;

	const previousPhase = env.state.session.phase;
	const exitDone = beginPhaseTransition();

	try {
		let response: Models.ActionResponse;
		try {
			response = await env.dispatch(action);
		} catch (err) {
			// The action failed — bring the outgoing phase back into view
			// instead of leaving the board empty, and tell the player.
			await restorePhaseExit().catch(() => {});
			reportActionFailure(err);
			return false;
		}

		try {
			await awaitExitAnimation(exitDone);

			env.updateState({ ...env.state, ...response });
			if (onBeforeFinish) await onBeforeFinish(response);
			await BattlegroundEvent.phaseFinished.emit({ previousPhase });
		} catch (err) {
			// The session advanced but the phase switch itself failed (e.g. a
			// handler threw). The run is still live — report it rather than
			// letting the rejection disappear into an async event listener.
			reportActionFailure(err);
		}
		return true;
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
			// A session from a newer server can name a phase this build does not
			// declare — surface it instead of leaving a blank board.
			onUnknownPhase: reportUnknownPhase,
		});
		this.phaseController = phaseController;
		controller = phaseController;

		this.disposers = wireBattlegroundEvents();

		Components.Background.create();
		Components.NamesDisplay.create();
		Components.Board.create();
		Components.DiscardZone.create();
		Components.UI.create();

		// The visible layer (background, board, HUD) is up, so start the
		// cross-screen fade now. The phase transition below is slow — it summons
		// the player's team (~2s of spawn animation) and slides the phase UI in —
		// and waiting for it would hold the player on a black screen.
		// `revealScreen()` is idempotent, so the base class's call once
		// `buildScreen()` resolves is a no-op.
		this.revealScreen();

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
		resetActionFailureState();
		resetCombatPhaseState();
		Chara.clearAll();
		Board.setIsInputEnabled(true);
		UI.destroy();
	}
}
