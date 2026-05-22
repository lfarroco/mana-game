import Phaser from "phaser";
import { setCurrentScene, State, getState, setState } from "@Models/State";
import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import { CombatRunner } from "Client/Scenes/Battleground/RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "@Systems/BattlegroundSystems";
import * as ForceStats from "Client/Scenes/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "Client/Scenes/Battleground/Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, resetBoard } from "Client/Scenes/Battleground/PhaseManager";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import { getServerAdapter } from "@Core/ServerFactory";
import { ServerFactory } from "@Core/ServerFactory";
import { createGameController } from "@Core/GameControllerFactory";
import { disableMultiplayer, enableMultiplayer } from "@Multiplayer/MultiplayerManager";
import { getPlayerProfile } from "@Multiplayer/MultiplayerManager";
import { initializeVisualizer, destroyVisualizer } from "Client/Visualizer";
import { MultiplayerQueueType } from "@Multiplayer/MultiplayerTypes";
import { initializePoisonSystem } from "@Systems/PoisonDamageSystem";
import { initializeRegenSystem } from "@Systems/RegenSystem";
import { initialize as initializeCombatStatsTracker } from "@Systems/CombatStatsTracker";
import * as playerNamesDisplay from "Client/Scenes/Battleground/Components/playerNamesDisplay";

export type BattlegroundSceneData = {
	state: State;
	// TODO: instead of this, we need the list of current units
	selectedCrystalId?: string;
	isMultiplayer?: boolean;
	multiplayerQueueType?: MultiplayerQueueType;
};

export class BattlegroundScene extends Phaser.Scene {
	state: State;
	combatRunner?: CombatRunner;

	cleanup() {
		// Stop the combat runner if it exists
		if (this.combatRunner) {
			this.combatRunner.stop();
			this.combatRunner = undefined;
		}

		// Clean up event system
		destroyVisualizer();

		clearAll();
		this.time.removeAllEvents();
		this.children.removeAll(true);

		Systems.Setup.destroy();

		UIManager.destroy();
		playerNamesDisplay.destroy();
	}

	constructor() {
		super("BattlegroundScene");
	}

	create = async (data: BattlegroundSceneData) => {
		const state = data?.state || getState();

		this.state = state;

		// Update global state when scene receives new state data (important for testing)
		if (data?.state) {
			setState(state);
		}

		setCurrentScene(this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

		initializeVisualizer();

		const speed = getOption("speed");

		this.time.timeScale = speed;
		this.tweens.timeScale = speed;

		this.start({ ...data, state });
	};

	start = async ({
		state,
		selectedCrystalId,
		isMultiplayer,
		multiplayerQueueType,
	}: BattlegroundSceneData) => {
		// TODO: the start for this scene should be just:
		// - render boards
		// - render untis
		// - display current phase

		const session = state.session;
		const multiplayerModeEnabled = Boolean(isMultiplayer);

		// Keep global mode state in sync so controller/server selection matches the current run type.
		ServerFactory.setMultiplayer(multiplayerModeEnabled);
		if (multiplayerModeEnabled) {
			await enableMultiplayer(selectedCrystalId, multiplayerQueueType || "casual");
		} else {
			disableMultiplayer();
		}

		if (selectedCrystalId) {
			// TODO: the game data should be initialized before even getting into this scene
			Systems.Setup.initializeNewGame(selectedCrystalId);

			// Create session via server adapter for unified logic
			// This ensures the session exists before we try to get phase options
			const server = getServerAdapter();
			const playerId = state.session.player_id || "sp_player_" + Date.now();
			state.session.player_id = playerId;

			await server.createSession(playerId, selectedCrystalId);

			// Initialize the GameController after session creation
			createGameController(playerId);
		} else {
			state.session = session;

			// Ensure GameController is initialized for resumed sessions (e.g. multiplayer reconnect)
			const playerId = state.session.player_id || "local_player";
			createGameController(playerId);
		}

		Systems.Setup.setupSceneElements();

		Tooltip.init();

		const charas = getAllCharas();

		// Only summon units if there are no characters and we're not in combat phase
		// Combat phase handles its own summoning in transitionToCombatPhase
		if (charas.length === 0 && state.session.phase !== "combat") {
			await resetBoard();
		}

		let forceStatsState = ForceStats.initializeForceStatsState();
		forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
		CombatSystemStates.setCombatSystemStates({
			poisonSystemState: initializePoisonSystem(),
			regenSystemState: initializeRegenSystem(),
			combatStatsTrackerState: initializeCombatStatsTracker(state),
			forceStatsState,
		});

		UIManager.init(state);
		if (multiplayerModeEnabled) {
			playerNamesDisplay.create();

			const profile = await getPlayerProfile(state.session.player_id);
			playerNamesDisplay.update({
				playerName: profile.username,
				enemyName: "",
			});
		} else {
			playerNamesDisplay.destroy();
		}

		ResultsUI.createResultsUI();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		startPhase(state, {
			showReadyOnInitialCombat: multiplayerModeEnabled && !selectedCrystalId,
		});
	};

	update(time: number, delta: number): void {

		//TODO: the board and combatrunner can plug themselves into the scene update via events 
		//and remove themselves when not needed, instead of always updating every frame like this
		Board.update(time);

		if (this.combatRunner && this.combatRunner.isActive()) {
			this.combatRunner.updateFrame(this.state, time, delta);
		}
	}
}

export default BattlegroundScene;
