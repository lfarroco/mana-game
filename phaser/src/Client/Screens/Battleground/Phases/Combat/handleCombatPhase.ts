import * as Types from "@Core/Types";
import * as Board from "@Models/Board";
import * as Unit from "@Models/Entities/Unit";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";

import * as BrowserCombatEffects from "@Screens/Battleground/Phases/Combat/BrowserCombatEffects";
import * as CombatPlaybackController from "@Screens/Battleground/Phases/Combat/CombatPlaybackController";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";

import * as Constants from "@Constants";
import * as PoisonSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as GameController from "@Core/GameController";

const COMBAT_START_DELAY_MS = 300;

type PlaybackDisposer = () => void;

export type CombatPhaseResult =
	| { type: "completed"; session: Types.SessionData }
	| { type: "cancelled" };

let stopActivePlayback: PlaybackDisposer = () => { };
let activeCombatState: Types.CombatState | null = null;

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;

	io.screens.battleground.events.phaseFinished.listen(finishCombatPhase);
	io.screens.battleground.events.combatContinueRequested.listen(handleCombatContinueRequested);
	io.screens.battleground.events.combatReplayRequested.listen(handleCombatReplayRequested);

}

async function finishCombatPhase(phase: Types.PhaseType): Promise<void> {
	if (phase !== "combat") return;

	cleanupPlayback();
	activeCombatState = null;
	await resetBoard(true);
	namesDisplay.updateNameDisplay({ enemyName: "" });

}

function cleanupPlayback(): void {
	stopActivePlayback();
	stopActivePlayback = () => { };
}

const getInitialCombatUnits = (combatState: Types.CombatState) => {
	if (combatState.initialUnits && combatState.initialUnits.length > 0) {
		return combatState.initialUnits;
	}

	if (combatState.units && combatState.units.length > 0) {
		return combatState.units;
	}

	return combatState.enemyTeam;
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
			state,
			resultType,
			() => {
				resultHandled();
				io.screens.battleground.events.combatContinueRequested.emit(undefined);
			},
			() => {
				resultHandled();
				io.screens.battleground.events.combatReplayRequested.emit(undefined);
			}
		);
		void ResultsUI.slideIn();
	});
};

const createCombatEffects = () => {
	const effectsIndex = BrowserCombatEffects.createBrowserCombatEffects();
	const baseOnCombatEnd = effectsIndex.onCombatEnd;

	//wtf
	effectsIndex.onCombatEnd = async (playbackState, outcome, combatStates) => {
		await baseOnCombatEnd?.(playbackState, outcome, combatStates);
		Board.setIsInputEnabled(true);

		await showCombatResults({
			resultType: getCombatResultType(outcome),
		});
	};

	return effectsIndex;
};

const startCombatPlayback = async ({
	combatState,
}: {
	combatState: Types.CombatState;
}) => {
	await setupCombatBoard(combatState);
	await animation.delay(COMBAT_START_DELAY_MS);

	const effectsIndex = createCombatEffects();
	const controller = CombatPlaybackController.createCombatPlaybackController(
		combatState.logs,
		effectsIndex
	);
	const updateHandler = (time: number, delta: number) => {
		controller.updateFrame(state, time, delta);
		if (!controller.isActive()) {
			io.scene.events.off("update", updateHandler);
		}
	};

	io.scene.events.on("update", updateHandler);

	return () => {
		io.scene.events.off("update", updateHandler);
		controller.stop();
	};
};

async function beginCombatPlayback(): Promise<void> {
	if (!activeCombatState || state.session.phase !== "combat") {
		return;
	}

	cleanupPlayback();
	stopActivePlayback = await startCombatPlayback({
		combatState: activeCombatState,
	});
}

function handleCombatContinueRequested(): void {
	if (state.session.phase !== "combat") {
		return;
	}

	void GameController.completeCombatEncounter();
}

function handleCombatReplayRequested(): void {
	if (state.session.phase !== "combat") {
		return;
	}

	void beginCombatPlayback();
}

const setupCombatBoard = async (combatState: Types.CombatState): Promise<void> => {
	Board.setIsInputEnabled(false);
	Board.setEnemyBoardVisible(true);

	namesDisplay.updateNameDisplay({
		enemyName: combatState.enemyPlayerName ?? "CPU",
	});

	Chara.clearAll();
	state.battleData.units = getInitialCombatUnits(combatState);

	const summonPromises = state.battleData.units.map((unit) => Chara.summon(unit, false));
	await Promise.all(summonPromises);
	state.battleData.units.forEach(Unit.resetUnitStats);
};

export async function handleCombatPhase(): Promise<void> {

	init();

	const { combatState } = state.session;

	if (!combatState) {
		throw new Error("Missing combatState while entering combat phase");
	}

	activeCombatState = combatState;
	await beginCombatPlayback();
}


export async function resetBoard(shouldResummonUnits: boolean = true): Promise<void> {

	// Hide enemy board after combat
	Board.setEnemyBoardVisible(false);

	// Re-enable board input after combat
	Board.setIsInputEnabled(true);

	if (shouldResummonUnits) {
		Chara.clearAll();
		state.battleData.units = [];
	}

	if (CombatSystemStates.isInitialized()) {
		const combatStates = CombatSystemStates.getCombatSystemStates();
		let newRegenState = RegenSystem.clearRegen(combatStates.regenSystemState, Constants.FORCE_ID_PLAYER);
		newRegenState = RegenSystem.clearRegen(newRegenState, Constants.FORCE_ID_CPU);
		CombatSystemStates.updateRegenSystemState(newRegenState);

		let newPoisonState = PoisonSystem.clearPoison(
			combatStates.poisonSystemState,
			Constants.FORCE_ID_PLAYER
		);
		newPoisonState = PoisonSystem.clearPoison(newPoisonState, Constants.FORCE_ID_CPU);
		CombatSystemStates.updatePoisonSystemState(newPoisonState);
	}

	if (shouldResummonUnits) {
		const summonPromises = state.session.team.units.map(async (unit, index) => {
			await animation.delay(index * 200);
			await Chara.summon(unit, true);
		});
		await Promise.all(summonPromises);
	}
}