import { State } from "@Models/State";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import * as Encounter from "./Systems/Encounter";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as EffectCardShop from "./Systems/Shop/EffectCardShop";
import { showMatchResult } from "./Systems/MatchResultSystem";


export async function handleMultiplayerPhase(state: State) {
	console.log("Starting Multiplayer Phase handling...");
	const result = await MultiplayerManager.getInstance().getPhaseOptions(state);

	console.log(`Multiplayer Phase: ${result.phase}`);

	switch (result.phase) {
		case "combat":
			console.log("Multiplayer Combat - waiting for implementation");
			// In a real implementation this would trigger combat playback based on server data
			break;

		case "encounter":
			const encounterIds = result.options.map(o => o.id);
			await Encounter.open(state, encounterIds);
			break;

		case "shop":
			const shopCardIds = result.options.map(o => o.id);
			// In multiplayer, we might restrict filtering or just show what server sends
			await HeroShop.openHeroShop(undefined, undefined, shopCardIds);
			break;

		case "upgrade_core":
			const upgradeIds = result.options.map(o => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
			// In multiplayer, selection is handled via MultiplayerManager interception in EffectCardShop
			// We might need to handle the "continuation" here if the shop closes?
			// EffectCardShop.openUpgradeCorePhase resolves when closed.
			break;

		case "add_reaction_core":
			const reactionIds = result.options.map(o => o.id);
			await EffectCardShop.openUpgradeCorePhase("effectCardShop.title", reactionIds);
			break;

		case "victory":
			await showMatchResult(true);
			break;

		case "game_over":
			await showMatchResult(false);
			break;

		default:
			console.warn(`Unknown multiplayer phase: ${result.phase}`);
			break;
	}
}
