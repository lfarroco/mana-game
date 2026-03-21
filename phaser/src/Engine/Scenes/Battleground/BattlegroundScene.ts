import Phaser from "phaser";
import { setCurrentScene, State, getState, setState } from "@Models/State";
import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import { CombatRunner } from "@Scenes/Battleground/RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "@Systems/BattlegroundSystems";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, resetBoard } from "@Scenes/Battleground/PhaseManager";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import { getServerAdapter } from "@Core/ServerFactory";
import { ServerFactory } from "@Core/ServerFactory";
import { createGameController } from "@Core/GameControllerFactory";
import { disableMultiplayer, enableMultiplayer } from "@Multiplayer/MultiplayerManager";
import { EventEmitter, SimpleEventEmitter } from "@Systems/Events";
import { initializeVisualizer, destroyVisualizer } from "@Engine/Visualizer";

export type BattlegroundSceneData = {
	state: State;
	// TODO: instead of this, we need the list of current units
	selectedCrystalId?: string;
	isMultiplayer?: boolean;
};

export class BattlegroundScene extends Phaser.Scene {
	bgContainer!: Phaser.GameObjects.Container;
	cloudsBackground!: Phaser.GameObjects.Shader;
	state: State;
	combatRunner?: CombatRunner;
	eventEmitter: EventEmitter;

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

		// Initialize event system per Architecture Proposal Item 3
		this.eventEmitter = new SimpleEventEmitter();
		initializeVisualizer();

		const speed = getOption("speed");

		this.time.timeScale = speed;
		this.tweens.timeScale = speed;

		this.start({ ...data, state });
	};

	start = async ({ state, selectedCrystalId, isMultiplayer }: BattlegroundSceneData) => {
		// TODO: the start for this scene should be just:
		// - render boards
		// - render untis
		// - display current phase

		const session = state.session;
		const multiplayerModeEnabled = Boolean(isMultiplayer);

		// Keep global mode state in sync so controller/server selection matches the current run type.
		ServerFactory.setMultiplayer(multiplayerModeEnabled);
		if (multiplayerModeEnabled) {
			await enableMultiplayer(selectedCrystalId);
		} else {
			disableMultiplayer();
		}

		// Initialize the Visualizer early in the scene startup
		initializeVisualizer();

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

		UIManager.init(state);

		ResultsUI.createResultsUI();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		startPhase(state, this.eventEmitter);
	};

	update(time: number, delta: number): void {
		Board.update(time);

		// TODO: instead, we can have a "combat system", that informs if the simulation is running
		if (this.combatRunner && this.combatRunner.isActive()) {
			this.combatRunner.updateFrame(this.state, time, delta);
		}
	}
}

export default BattlegroundScene;
