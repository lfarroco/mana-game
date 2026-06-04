import * as Board from "@Models/Board";
import type * as Types from "@Core/Types";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as Tooltip from "Client/Components/Tooltip";
import * as Encounter from "@Systems/Encounter";
import * as handleCombatPhase from "@Screens/Battleground/Phases/Combat/handleCombatPhase";
import * as SessionManager from "@Core/SessionManager";

import * as Shop from "./Shop/ShopPanel";
import * as Components from "./Components";
import * as UIManager from "./Components/UI/UI";
import * as Phases from "./Phases";
import * as Chara from "@Systems/Chara/Chara";
import * as animation from "@Utils/animation";

type PhaseExecutionResult = Types.SessionData | null;

const assertNeverPhase = (phase: never): never => {
	throw new Error(`Unknown phase: ${phase}`);
};

const shouldRefreshPlayerUnit = (unitId: string, expectedPower: number, expectedRank: number): boolean => {
	if (!Chara.hasCharaById(unitId)) {
		return false;
	}

	const renderedUnit = Chara.getUnit(Chara.mustGetCharaById(unitId));
	return renderedUnit.power !== expectedPower || renderedUnit.rank !== expectedRank;
};

const syncPlayerBoardUnitsIO = async (): Promise<void> => {
	const summonPromises = state.session.team.units.map(async (unit, index) => {
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

const updateSessionState = (nextSession: Types.SessionData) => {
	const previousSession = state.session;
	const winsDelta = nextSession.wins - previousSession.wins;
	const previousLives = SessionManager.getRemainingLives(previousSession);
	const nextLives = SessionManager.getRemainingLives(nextSession);
	const livesDelta = nextLives - previousLives;

	state.session = nextSession;

	UIManager.events.onWinsChanged(nextSession.wins, winsDelta);
	if (livesDelta !== 0) {
		UIManager.events.onLivesChanged(nextLives, livesDelta);
	}
	UIManager.events.onRoundChanged(nextSession.round);
	SessionManager.updateSession(nextSession.player_id, nextSession);
};

export const createBattlegroundScreen = async () => {

	Components.create();

	AudioManager.playMusic("music_battlemap_vetruv");

	Shop.refresh(null);

	Tooltip.init();

	Board.setIsInputEnabled(true);

	ControlsSystem.init({ context: "battleground" });

	// ~~~~~ // ~~~~~ //

	await runPhaseLoop();

};

async function executePhase(
	phase: Types.PhaseType,
): Promise<PhaseExecutionResult> {

	if (phase !== 'combat') {
		await syncPlayerBoardUnitsIO();
	}

	switch (phase) {
		case "encounter":
			return await Encounter.displayOptions();

		case "combat":
			{
				const result = await handleCombatPhase.handleCombatPhase();
				return result.type === "cancelled" ? null : result.session;
			}

		case "shop":
			return await Phases.handleShopPhase();

		case "upgrade_core":
			return await Phases.handleUpgradeCorePhase();

		case "add_reaction_core":
			return await Phases.handleAddReactionCorePhase();

		case "orb_shop":
			return await Phases.handleOrbShopPhase();

		case "victory":
			return await Phases.handleVictoryPhase();

		case "game_over":
			return await Phases.handleGameOverPhase();

		default:
			return assertNeverPhase(phase);
	}
}

async function runPhaseLoop() {
	while (true) {
		const nextSession = await executePhase(state.session.phase);
		if (!nextSession) {
			return;
		}

		updateSessionState(nextSession);

	}
}


