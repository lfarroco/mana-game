import * as Board from "@Components/Board/Board";
import * as Models from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as Tooltip from "@Components/Tooltip/Tooltip";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "./Phases/Encounter/Encounter";
import * as handleCombatPhase from "./Phases/Combat/handleCombatPhase";
import * as ShopPhase from "./Phases/Shop/handleShopPhase";
import * as OrbShopPhase from "./Phases/OrbShop/handleOrbShopPhase";

import * as Components from "./Components";
import * as Phases from "./Phases";
import * as animation from "@Utils/animation";
import { getRemainingLives } from "../../SessionManager";
import { initialState } from "@Models/ClientState";
import { env } from "@Env";
import { BattlegroundEvent, NavigationEvent } from "../../Events";
import * as UI from "./Components/UI/UI";

// ---------------------------------------------------------------------------
// Phase advancement helper
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
 * @param onBeforeFinish - Optional callback that fires before phaseFinished is emitted.
 */
export const finishPhase = async (
	onBeforeFinish?: () => void | Promise<void>,
): Promise<void> => {
	const previousPhase = env.state.session.phase;
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

	// FIXME: input enable/disable should be managed at the screen level, not
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

// FIXME: player board sync helpers (shouldRefreshPlayerUnit, syncPlayerBoardUnits)
// belong in a dedicated player-board module rather than BattlegroundScreen.
const shouldRefreshPlayerUnit = (unitId: string, expectedPower: number, expectedRank: number): boolean => {
	if (!Chara.hasCharaById(unitId)) {
		return false;
	}

	const renderedUnit = Chara.getUnit(Chara.mustGetCharaById(unitId));
	return renderedUnit.power !== expectedPower || renderedUnit.rank !== expectedRank;
};

const syncPlayerBoardUnits = async (): Promise<void> => {
	const summonPromises = env.state.session.team.units.map(async (unit, index) => {
		if (!Chara.hasCharaById(unit.id)) {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
			return;
		}

		if (!shouldRefreshPlayerUnit(unit.id, unit.power, unit.rank)) {
			return;
		}

		const chara = Chara.mustGetCharaById(unit.id);
		Chara.destroy(chara);
		await Chara.summon(unit, true);
	});

	await Promise.all(summonPromises);
};


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
	await executePhase(env.state.session.phase, previousPhase);
};


