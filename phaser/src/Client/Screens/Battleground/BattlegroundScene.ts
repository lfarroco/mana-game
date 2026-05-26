import * as UIManager from "@UI/UI";
import * as Board from "@Models/Board";
import * as OptionsStore from "@Models/OptionsStore";
import * as AudioManager from "@Systems/AudioManager";
import * as ControlsSystem from "@Systems/Controls";
import * as ForceStats from "Client/Screens/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as ResultsUI from "Client/Screens/Battleground/Results/ResultsUI";
import * as Tooltip from "@Components/Tooltip";
import * as MultiplayerManager from "@Multiplayer/MultiplayerManager";
import * as PoisonDamageSystem from "@Systems/PoisonDamageSystem";
import * as RegenSystem from "@Systems/RegenSystem";
import * as CombatStatsTracker from "@Systems/CombatStatsTracker";
import * as playerNamesDisplay from "Client/Screens/Battleground/Components/playerNamesDisplay";
import * as CloudsBackground from "@Components/cloudBackground/CloudsBackground";
import * as animation from "@Utils/animation";
import * as Chara from "@Systems/Chara/Chara";
import * as Encounter from "@Systems/Encounter";
import * as handleShopPhase from "./Shop/handleShopPhase";
import * as DiscardZone from "./Shop/DiscardZone";
import * as Shop from "./Shop/ShopPanel";

const DEFAULT_SCENE_SOUND_VOLUME = 0.05;

export const createBattlegroundScreen = async () => {
	const speed = OptionsStore.getOption("speed");
	io.scene.time.timeScale = speed;
	io.scene.tweens.timeScale = speed;

	io.scene.sound.setVolume(OptionsStore.getOption("soundVolume") ?? DEFAULT_SCENE_SOUND_VOLUME);

	new CloudsBackground.CloudsBackground({
		preset: "forest",
		depth: -2000,
		timeScale: 0.3,
	});

	Board.init();

	ControlsSystem.init({ context: "battleground" });

	Tooltip.init();

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

	const summonPromises = state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});
	await Promise.all(summonPromises);

	Shop.refresh(null);

	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~ //

	await runPhaseLoop();

};

async function runPhaseLoop() {
	while (true) {

		switch (state.session.phase) {
			case "encounter":
				state.session = await Encounter.displayOptions();
				break;

			case "shop":
				state.session = await handleShopPhase.handleShopPhase();
				break;
			case "game_over":
				return;
			default:
				throw new Error(`Unknown phase: ${state.session.phase}`);
				return;

		}

	}
}


