import * as GameServer from "@Core/GameServer";
import type { CombatState, SessionData } from "@Core/Types";
import * as Board from "@Models/Board";
import * as Unit from "@Models/Entities/Unit";
import * as animation from "@Utils/animation";
import * as io from "@PhaserIO";
import * as Chara from "@Systems/Chara/Chara";
import * as BrowserCombatEffects from "./BrowserCombatEffects";
import * as CombatPlaybackController from "./CombatPlaybackController";
import * as PhaseManager from "./PhaseManager";
import * as ResultsUI from "./Results/ResultsUI";
import * as namesDisplay from "./Components/UI/namesDisplay";

const COMBAT_START_DELAY_MS = 300;

const cloneValue = <T>(value: T): T => {
	if (typeof globalThis.structuredClone === "function") {
		return globalThis.structuredClone(value);
	}

	return JSON.parse(JSON.stringify(value)) as T;
};

const getInitialCombatUnits = (combatState: CombatState) => {
	if (combatState.initialUnits && combatState.initialUnits.length > 0) {
		return cloneValue(combatState.initialUnits);
	}

	if (combatState.units && combatState.units.length > 0) {
		return cloneValue(combatState.units);
	}

	return cloneValue(combatState.enemyTeam);
};

const setupCombatBoard = async (combatState: CombatState): Promise<void> => {
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

export async function handleCombatPhase(): Promise<SessionData> {
	const server = GameServer.getServer();
	let combatState = state.session.combatState ?? null;

	if (!combatState) {
		const phaseOptions = await server.getPhaseOptions(state.session.player_id);
		combatState = phaseOptions.combatState ?? null;
		state.session.combatState = combatState ?? undefined;
	}

	if (!combatState) {
		throw new Error("Missing combatState while entering combat phase");
	}

	return await new Promise<SessionData>((resolve, reject) => {
		let disposePlayback = () => { };

		const disposeCurrentPlayback = () => {
			disposePlayback();
			disposePlayback = () => { };
		};

		const cleanup = () => {
			disposeCurrentPlayback();
			io.scene.events.off("shutdown", cleanup);
		};

		const continueToNextPhase = async () => {
			cleanup();
			try {
				await PhaseManager.resetBoard(true);
				namesDisplay.updateNameDisplay({ enemyName: "" });
				const nextSession = await server.handleAction(state.session.player_id, "combat_done");
				resolve(nextSession);
			} catch (error) {
				reject(error);
			}
		};

		const startPlayback = async () => {
			disposeCurrentPlayback();
			await setupCombatBoard(combatState);
			await animation.delay(COMBAT_START_DELAY_MS);

			const effects = BrowserCombatEffects.createBrowserCombatEffects();
			const baseOnCombatEnd = effects.onCombatEnd;

			effects.onCombatEnd = async (playbackState, outcome, combatStates) => {
				await baseOnCombatEnd?.(playbackState, outcome, combatStates);
				Board.setIsInputEnabled(true);

				const resultType = outcome === "player_lost" ? "defeat" : "victory";

				await new Promise<void>((resultHandled) => {
					void ResultsUI.displayResults(
						state,
						resultType,
						() => {
							resultHandled();
							void continueToNextPhase();
						},
						() => {
							resultHandled();
							void startPlayback().catch(reject);
						}
					);
					void ResultsUI.slideIn();
				});
			};

			const controller = CombatPlaybackController.createCombatPlaybackController(
				state,
				combatState.logs,
				effects
			);

			const updateHandler = (time: number, delta: number) => {
				controller.updateFrame(state, time, delta);
				if (!controller.isActive()) {
					io.scene.events.off("update", updateHandler);
				}
			};

			disposePlayback = () => {
				io.scene.events.off("update", updateHandler);
				controller.stop();
			};

			io.scene.events.on("update", updateHandler);
		};

		io.scene.events.on("shutdown", cleanup);
		void startPlayback().catch((error) => {
			cleanup();
			reject(error);
		});
	});
}