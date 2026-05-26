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
import * as Encounter from "@Systems/Encounter";
import * as Types from "@Core/Types";
import * as Card from "@Models/Entities/Card";
import * as CharaShop from "@Systems/Shop/CharaShop";
import { Unit } from "@Models/Entities/Unit";

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

	const summonPromises = state.session.team.units.map(async (unit, index) => {
		await animation.delay(index * 200);
		await Chara.summon(unit, true);
	});
	await Promise.all(summonPromises);

	Shop.refresh(null);

	Board.setIsInputEnabled(true);

	// ~~~~~ // ~~~~~

	//PhaseManager.startPhase();
	await runPhaseLoop();
	console.log(">>> Exited phase loop");

};

async function runPhaseLoop() {
	while (true) {

		console.log(">>> Starting phase loop iteration, current phase:", state.session.phase);

		switch (state.session.phase) {
			case "encounter":
				state.session = await Encounter.displayOptions();
				break;

			case "shop":
				state.session = await handleShopPhase();
				break;
			case "game_over":
				console.log(">>> Game over phase reached");
				return;
			default:
				console.log("Unknown phase, skipping...", state.session.phase);
				return;

		}

	}
}

async function handleShopPhase(): Promise<Types.SessionData> {

	const { session } = state;
	const shopCardIds = session.current_options.map((o) => o.id);
	const cardDefs = shopCardIds.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

	await CharaShop.renderTavernCharas(cardDefs);

	await Shop.SlideIn();

	const result = await new Promise<Types.SessionData>(resolve => {
		io.scene.events.once("sessionUpdated", ({ session }: {
			actionId: string,
			session: Types.SessionData
		}) => {

			resolve(session);
		});

	});

	result.team.units.forEach((unit: Unit) => {
		Chara.refreshChara(unit);
	});

	await Shop.SlideOut();

	console.log(">>> Unit purchased from shop:", result);

	return result;
}


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
