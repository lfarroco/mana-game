import Phaser from "phaser";
import * as State from "@Models/State";
import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import * as RunCombatIO from "Client/Scenes/Battleground/RunCombatIO";
import * as OptionsStore from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as ForceStats from "Client/Scenes/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Chara from "@Systems/Chara/Chara";
import * as ResultsUI from "Client/Scenes/Battleground/Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import * as PhaseManager from "Client/Scenes/Battleground/PhaseManager";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import * as ServerFactory_1 from "@Core/ServerFactory";
import * as ServerFactory from "@Core/ServerFactory";
import * as GameControllerFactory from "@Core/GameControllerFactory";
import * as MultiplayerManager from "@Multiplayer/MultiplayerManager";
import * as MultiplayerManager_1 from "@Multiplayer/MultiplayerManager";
import * as Visualizer from "Client/Visualizer";
import * as MultiplayerTypes from "@Multiplayer/MultiplayerTypes";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as playerNamesDisplay from "Client/Scenes/Battleground/Components/playerNamesDisplay";
import * as CloudsBackground from "@Components/cloudBackground/CloudsBackground";
import * as Unit from "@Models/Entities/Unit";
import * as constants from "@Constants/constants";
import * as battlegroundConstants from "./battlegroundConstants";

let cloudsBackground: CloudsBackground.CloudsBackground | null = null;

export type BattlegroundSceneData = {
	state: State.State;
	// TODO: instead of this, we need the list of current units
	selectedCrystalId?: string;
	isMultiplayer?: boolean;
	multiplayerQueueType?: MultiplayerTypes.MultiplayerQueueType;
};

export class BattlegroundScene extends Phaser.Scene {
	state: State.State;
	combatRunner?: RunCombatIO.CombatRunner;

	cleanup() {
		// Stop the combat runner if it exists
		if (this.combatRunner) {
			this.combatRunner.stop();
			this.combatRunner = undefined;
		}

		// Clean up event system
		Visualizer.destroyVisualizer();

		Chara.clearAll();
		this.time.removeAllEvents();
		this.children.removeAll(true);

		cloudsBackground?.destroy();
		cloudsBackground = null;

		UIManager.destroy();
		playerNamesDisplay.destroy();
	}

	constructor() {
		super("BattlegroundScene");
	}

	create = async (data: BattlegroundSceneData) => {
		const state = data?.state || State.getState();

		this.state = state;

		// Update global state when scene receives new state data (important for testing)
		if (data?.state) {
			State.setState(state);
		}

		State.setCurrentScene(this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

		Visualizer.initializeVisualizer();

		const speed = OptionsStore.getOption("speed");

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
		ServerFactory.ServerFactory.setMultiplayer(multiplayerModeEnabled);
		if (multiplayerModeEnabled) {
			await MultiplayerManager.enableMultiplayer(selectedCrystalId, multiplayerQueueType || "casual");
		} else {
			MultiplayerManager.disableMultiplayer();
		}

		if (selectedCrystalId) {
			// TODO: the game data should be initialized before even getting into this scene

			state.session.team.units = [];
			state.session.round = 1;
			state.session.losses = 0; // BG_CONSTANTS.INITIAL_PLAYER_LIVES is 4, so 0 losses

			// TODO: there are 2 FORCE_ID_PLAYER constants
			const crystalUnit = Unit.makeUnit(constants.FORCE_ID_PLAYER, selectedCrystalId, { x: 1, y: 1 });
			state.session.team.units.push(crystalUnit);
			state.session.step = 0;

			this.sound.setVolume(OptionsStore.getOption("soundVolume") ?? battlegroundConstants.DEFAULT_SCENE_SOUND_VOLUME);

			// Create session via server adapter for unified logic
			// This ensures the session exists before we try to get phase options
			const server = ServerFactory_1.getServerAdapter();
			const playerId = state.session.player_id || "sp_player_" + Date.now();
			state.session.player_id = playerId;

			await server.createSession(playerId, selectedCrystalId);

			// Initialize the GameController after session creation
			GameControllerFactory.createGameController(playerId);
		} else {
			state.session = session;

			// Ensure GameController is initialized for resumed sessions (e.g. multiplayer reconnect)
			const playerId = state.session.player_id || "local_player";
			GameControllerFactory.createGameController(playerId);
		}

		cloudsBackground = new CloudsBackground.CloudsBackground({
			preset: "forest",
			depth: -2000,
			timeScale: 0.3,
		});


		const cloudsBackgroundShader = cloudsBackground.getShader();

		const bgContainer = this.add.container(0, 0);
		bgContainer.setDepth(-2000);
		bgContainer.add([cloudsBackgroundShader]);

		Board.init();

		ControlsSystem.init(this, { context: "battleground" });

		Tooltip.init();

		const charas = Chara.getAllCharas();

		// Only summon units if there are no characters and we're not in combat phase
		// Combat phase handles its own summoning in transitionToCombatPhase
		if (charas.length === 0 && state.session.phase !== "combat") {
			await PhaseManager.resetBoard();
		}

		let forceStatsState = ForceStats.initializeForceStatsState();
		forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
		CombatSystemStates.setCombatSystemStates({
			poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
			regenSystemState: RegenSystem.initializeRegenSystem(),
			combatStatsTrackerState: CombatStatsTracker.initialize(state),
			forceStatsState,
		});

		UIManager.init(state);
		if (multiplayerModeEnabled) {
			playerNamesDisplay.create();

			const profile = await MultiplayerManager_1.getPlayerProfile(state.session.player_id);
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

		PhaseManager.startPhase(state, {
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
