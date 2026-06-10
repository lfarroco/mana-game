import * as Types from "@Core/Types";
import * as Board from "@Models/Board";
import * as Unit from "@Models/Entities/Unit";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";

import * as BrowserCombatEffects from "@Screens/Battleground/Phases/Combat/BrowserCombatEffects";
import * as CombatPlaybackController from "@Screens/Battleground/Phases/Combat/CombatPlaybackController";
import * as ResultsUI from "@Screens/Battleground/Components/Results/ResultsUI";
import * as namesDisplay from "@Screens/Battleground/Components/UI/namesDisplay";
import * as BattlegroundNavigation from "@Screens/Battleground/Navigation";

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

type ActiveCombatRun = {
	disposePlayback: PlaybackDisposer;
	unsubscribeFromExit: () => void;
};

let activeCombatRun: ActiveCombatRun | null = null;

let initialized = false;
function init() {
	if (initialized) return;
	initialized = true;

	io.screens.battleground.events.phaseFinished.listen(finishCombatPhase);

}

async function finishCombatPhase(phase: Types.PhaseType): Promise<void> {
	if (phase !== "combat") return;

	cleanupActiveCombatRun();
	await resetBoard(true);
	namesDisplay.updateNameDisplay({ enemyName: "" });

}

function cleanupActiveCombatRun(): void {
	if (!activeCombatRun) {
		return;
	}

	activeCombatRun.disposePlayback();
	activeCombatRun.unsubscribeFromExit();
	activeCombatRun = null;
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

const createPlaybackDisposerManager = () => {
	let disposePlayback: PlaybackDisposer = () => { };

	return {
		replace(nextDisposer: PlaybackDisposer) {
			disposePlayback();
			disposePlayback = nextDisposer;
		},
		dispose() {
			disposePlayback();
			disposePlayback = () => { };
		},
	};
};

const showCombatResults = ({
	resultType,
	onContinue,
	onReplay,
}: {
	resultType: "defeat" | "victory";
	onContinue: () => void;
	onReplay: () => void;
}) => {
	return new Promise<void>((resultHandled) => {
		void ResultsUI.displayResults(
			state,
			resultType,
			() => {
				resultHandled();
				onContinue();
			},
			() => {
				resultHandled();
				onReplay();
			}
		);
		void ResultsUI.slideIn();
	});
};

const createCombatEffects = ({
	onContinue,
	onReplay,
}: {
	onContinue: () => void;
	onReplay: () => void;
}) => {
	const effectsIndex = BrowserCombatEffects.createBrowserCombatEffects();
	const baseOnCombatEnd = effectsIndex.onCombatEnd;

	//wtf
	effectsIndex.onCombatEnd = async (playbackState, outcome, combatStates) => {
		await baseOnCombatEnd?.(playbackState, outcome, combatStates);
		Board.setIsInputEnabled(true);

		await showCombatResults({
			resultType: getCombatResultType(outcome),
			onContinue,
			onReplay,
		});
	};

	return effectsIndex;
};

const startCombatPlayback = async ({
	combatState,
	onContinue,
	onReplay,
}: {
	combatState: Types.CombatState;
	onContinue: () => void;
	onReplay: () => void;
}) => {
	await setupCombatBoard(combatState);
	await animation.delay(COMBAT_START_DELAY_MS);

	const effectsIndex = createCombatEffects({ onContinue, onReplay });
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

	return () => {
		io.scene.events.off("update", updateHandler);
		controller.stop();
	};

	io.scene.events.on("update", updateHandler);
};

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

	cleanupActiveCombatRun();

	const playbackDisposers = createPlaybackDisposerManager();
	const unsubscribeFromExit = BattlegroundNavigation.onBattlegroundExit(() => {
		cleanupActiveCombatRun();
	});

	activeCombatRun = {
		disposePlayback: () => playbackDisposers.dispose(),
		unsubscribeFromExit,
	};

	const startPlayback = async () => {
		if (!activeCombatRun) {
			return;
		}

		const disposePlayback = await startCombatPlayback({
			combatState,
			onContinue: () => {
				void GameController.completeCombatEncounter();
			},
			onReplay: () => {
				void startPlayback();
			},
		});

		playbackDisposers.replace(disposePlayback);
	};

	try {
		await startPlayback();
	} catch (error) {
		cleanupActiveCombatRun();
		throw error;
	}
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