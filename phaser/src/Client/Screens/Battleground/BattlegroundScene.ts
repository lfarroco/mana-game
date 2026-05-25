import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import * as OptionsStore from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as ForceStats from "Client/Screens/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as ResultsUI from "Client/Screens/Battleground/Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import * as DiscardZone from "@Systems/Shop/DiscardZone";
import * as MultiplayerManager from "@Multiplayer/MultiplayerManager";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as playerNamesDisplay from "Client/Screens/Battleground/Components/playerNamesDisplay";
import * as CloudsBackground from "@Components/cloudBackground/CloudsBackground";
import * as io from "@PhaserIO";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Shop from "@Systems/Shop/ShopPanel";
import * as PhaseManager from "./PhaseManager";

const DEFAULT_SCENE_SOUND_VOLUME = 0.05;

export const createBattlegroundScreen = async () => {
	const speed = OptionsStore.getOption("speed");
	io.scene.time.timeScale = speed;
	io.scene.tweens.timeScale = speed;

	io.scene.sound.setVolume(OptionsStore.getOption("soundVolume") ?? DEFAULT_SCENE_SOUND_VOLUME);

	start();
};

const start = async () => {
	// TODO: the start for this scene should be just:
	// - render boards
	// - render untis
	// - display current phase

	new CloudsBackground.CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});

	// from here, check state to figure out what to render
	//if (state.session.phase === ...

	Board.init();

	ControlsSystem.init({ context: "battleground" });

	Tooltip.init();

	// Only summon units if there are no characters and we're not in combat phase
	// Combat phase handles its own summoning in transitionToCombatPhase
	// if (charas.length === 0 && state.session.phase !== "combat") {
	// 	await PhaseManager.resetBoard();
	//}

	let forceStatsState = ForceStats.initializeForceStatsState();
	forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
	CombatSystemStates.setCombatSystemStates({
		poisonSystemState: PoisonDamageSystem.initializePoisonSystem(),
		regenSystemState: RegenSystem.initializeRegenSystem(),
		combatStatsTrackerState: CombatStatsTracker.initialize(state),
		forceStatsState,
	});

	UIManager.init(state);

	if (state.session.session_type.type !== "singleplayer") {
		playerNamesDisplay.create();

		const profile = await MultiplayerManager.getPlayerProfile(state.session.player_id);
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

	// PhaseManager.startPhase({
	// 	showReadyOnInitialCombat: true
	// });

	const summonPromises = state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});
	await Promise.all(summonPromises);

	Shop.create(null);

	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~

	PhaseManager.startPhase();

};



// update(time: number, delta: number): void {

// 	//TODO: the board and combatrunner can plug themselves into the scene update via events 
// 	//and remove themselves when not needed, instead of always updating every frame like this
// 	Board.update(time);

// 	if(this.combatRunner && this.combatRunner.isActive()) {
// 	this.combatRunner.updateFrame(State.getState(), time, delta);
// }
// 	}
// }

//export default BattlegroundScene;
