import Phaser from "phaser";
import { setCurrentScene, State, getState } from "@Models/State";
import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import { CombatRunner } from "./RunCombatIO";
import { getOption } from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as Systems from "@Systems/BattlegroundSystems";
import { clearAll, getAllCharas } from "@Systems/Chara/Chara";
import * as ResultsUI from "./Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import { startPhase, resetBoard } from "./PhaseManager";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import { getServerAdapter } from "@Core/ServerFactory";
import { ServerFactory } from "@Core/ServerFactory";
import { MultiplayerManager } from "@Multiplayer/MultiplayerManager";

export type BattlegroundSceneData = {
	state: State,
	// TODO: instead of this, we need the list of current units 
	selectedCrystalId?: string;
	isMultiplayer?: boolean;
};

export class BattlegroundScene extends Phaser.Scene {
	bgContainer!: Phaser.GameObjects.Container;
	cloudsBackground!: Phaser.GameObjects.Shader;
	state: State;
	combatRunner?: CombatRunner;

	cleanup() {
		console.log(":::: BattlegroundScene cleanup")
		
		// Stop the combat runner if it's still active
		if (this.combatRunner) {
			if (this.combatRunner.isActive()) {
				console.log(":::: Stopping active combat runner");
				this.combatRunner.stop();
			}
			this.combatRunner = undefined;
		}
		
		clearAll();
		this.time.removeAllEvents();
		this.children.removeAll(true);

		Systems.Setup.destroy();

		UIManager.destroy();
	}

	constructor() {
		super("BattlegroundScene");
		console.log("BattlegroundScene constructor");
	}


	create = async (data: BattlegroundSceneData) => {
		const state = data?.state || getState();
		const { session } = state;

		this.state = state;

		console.log(":::: BattlegroundScene creating logic...", session, "sceneData:", data);
		setCurrentScene(this);

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

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
		console.log(":::: BattlegroundScene starting logic...", session);

		if (selectedCrystalId) {
			// TODO: the game data should be initialized before even getting into this scene
			Systems.Setup.initializeNewGame(selectedCrystalId);

			// Set up multiplayer mode if needed
			if (isMultiplayer) {
				ServerFactory.setMultiplayer(true);
				await MultiplayerManager.getInstance().enableMultiplayer();
			}

			// Create session via server adapter for unified logic
			// This ensures the session exists before we try to get phase options
			const server = getServerAdapter();
			const playerId = state.session.player_id || "sp_player_" + Date.now();
			state.session.player_id = playerId;

			try {
				await server.createSession(playerId, selectedCrystalId);
				console.log(`Session created for player ${playerId} with crystal ${selectedCrystalId}`);
			} catch (error) {
				console.error("Failed to create session:", error);
			}
		} else {
			state.session = session;
		}

		Systems.Setup.setupSceneElements();

		Tooltip.init();

		const charas = getAllCharas();

		// Only summon units if there are no characters and we're not in combat phase
		// Combat phase handles its own summoning in transitionToCombatPhase
		if (charas.length === 0 && state.session.phase !== 'combat') {
			await resetBoard();
		}

		UIManager.init(state);

		ResultsUI.createResultsUI();

		DiscardZone.create();

		AudioManager.playMusic("music_battlemap_vetruv");

		startPhase(state);
	};

	update(time: number, delta: number): void {
		Board.update(time);

		// TODO: instead, we can have a "combat system", that informs if the simulation is running
		if (this.combatRunner) {
			this.combatRunner.updateFrame(this.state, time, delta);
		}
	}
}

export default BattlegroundScene;

