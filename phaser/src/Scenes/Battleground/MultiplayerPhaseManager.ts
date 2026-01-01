import { State, getCurrentScene } from "@Models/State";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import * as Encounter from "./Systems/Encounter";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as EffectCardShop from "./Systems/Shop/EffectCardShop";
import { showMatchResult } from "./Systems/MatchResultSystem";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";
import { createCombatPlaybackController } from "./CombatPlaybackController";
import { clearAll, create as createChara } from "@Systems/Chara/Chara";
import { FORCE_ID_PLAYER, SCREEN_WIDTH, SCREEN_HEIGHT } from "@Constants/constants";
import { BattlegroundScene } from "./BattlegroundScene";

// ... existing handleMultiplayerPhase ...



// ... update handleMultiplayerCombat usage ...
// I need to replace the WHOLE handleMultiplayerCombat function to update UIManager calls to createButton calls.



export async function handleMultiplayerPhase(state: State) {
	console.log("Starting Multiplayer Phase handling...");
	const result = await MultiplayerManager.getInstance().getPhaseOptions(state);

	console.log(`Multiplayer Phase: ${result.phase}`);

	// Sync Team State from Server
	if (result.team && result.team.units) {
		console.log("Syncing team from server...", result.team.units.length);
		const serverUnits = result.team.units;
		// We overwrite local units with server units, ensuring IDs match.
		// If we want to preserve local positions for smoothness, we might need matching logic.
		// But User requested "Server generates, sends to player", so Server is authoritative.
		// However, "player can move unit around" implies client position authority during phase.
		// But `getPhaseOptions` is called usually at start of phase or after major action.

		state.gameData.player.units = serverUnits;

		// Re-spawn visuals to match new units (if count changed or upgrades happened)
		// Or let the scene update loop handle it? Battleground usually manually creates Charas.
		// We might need to refresh visuals here if we are in non-combat phase.
		// For now, let's update data. Visuals might rely on `Encounter` or `Shop` opening logic to refresh?
		// Shop relies on `CharaShop.renderTavernCharas`.
		// Player units are `Chara` instances.
		// If we replace `state.gameData.player.units`, existing `Charas` might point to old unit objects?
		// Yes, `Chara` holds a reference to `Unit`.
		// So we MUST refresh visuals or merge data into existing objects.

		// For simplicity in this refactor: Clear and Recreate Player Charas?
		// Or Merge Data (HP, Rank, etc) into existing units if ID matches?
		// Let's try Merge first to avoid flickering.

		/*
		const currentUnits = state.gameData.player.units;
		serverUnits.forEach((su: any) => {
			const cu = currentUnits.find(u => u.id === su.id);
			if (cu) {
				Object.assign(cu, su); // Update stats
			} else {
				currentUnits.push(su); // Add new
			}
		});
		// Remove missing?
		// state.gameData.player.units = currentUnits.filter(u => serverUnits.find((su: any) => su.id === u.id));
		*/

		// Actually, simpler is to just replace and trigger a visual refresh if we can.
		// But in Phaser, destroying/creating sprites is cheap enough for this turn-based sync.
		state.gameData.player.units = serverUnits;

		// Optimization: if we are about to enter combat, skip this intermediate render 
		// because `handleMultiplayerCombat` will render everything including enemy units.
		if (result.phase !== "combat") {
			clearAll();
			// Ensure we await all creations to prevent race conditions
			await Promise.all(state.gameData.player.units.map(u => createChara(u)));
		}
	}

	switch (result.phase) {
		case "combat":
			if (result.combatState) {
				await handleMultiplayerCombat(state, result.combatState);
			} else {
				console.error("Multiplayer Combat Phase missing combatState!");
				const combatOption = result.options[0];
				// Auto-skip
				await MultiplayerManager.getInstance().sendOptionSelection(combatOption.id);
				await handleMultiplayerPhase(state);
			}
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

	async function handleMultiplayerCombat(state: State, combatState: any) {
		console.log("Initializing Multiplayer Combat:", combatState);


		// 1. Setup Units
		// Prioritize using the full unit list from server if available (to capture injected Cores)
		let allUnits = [];
		if (combatState.units) {
			allUnits = combatState.units;
		} else {
			const playerUnits = state.gameData.player.units;
			const enemyUnits = combatState.enemyTeam;
			// Ensure force IDs (just in case)
			playerUnits.forEach(u => u.force = FORCE_ID_PLAYER);
			allUnits = [...playerUnits, ...enemyUnits];
		}

		state.battleData.units = allUnits;

		// 2. Refresh Visuals
		clearAll();
		for (const u of state.battleData.units) {
			await createChara(u);
		}

		const scene = getCurrentScene() as BattlegroundScene;

		// 3. Ready Button
		await new Promise<void>((resolve) => {
			const btn = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "READY", {
				fontSize: '32px',
				color: '#ffffff',
				backgroundColor: '#000000',
				padding: { x: 20, y: 10 }
			})
				.setOrigin(0.5)
				.setInteractive({ useHandCursor: true });

			btn.once('pointerdown', () => {
				btn.destroy();
				resolve();
			});
		});

		// 4. Start Playback
		const effects = createBrowserCombatEffects();
		// Wrap onCombatEnd to add our Continue logic
		const originalOnCombatEnd = effects.onCombatEnd;
		effects.onCombatEnd = async (state, outcome, combatStates) => {
			await originalOnCombatEnd(state, outcome, combatStates);

			// Show Continue Button
			await new Promise<void>((resolve) => {
				const btn = scene.add.text(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "CONTINUE", {
					fontSize: '32px',
					color: '#ffffff',
					backgroundColor: '#000000',
					padding: { x: 20, y: 10 }
				})
					.setOrigin(0.5)
					.setInteractive({ useHandCursor: true });

				btn.once('pointerdown', () => {
					btn.destroy();
					resolve();
				});
			});

			// Proceed
			await MultiplayerManager.getInstance().sendOptionSelection("combat_done");
			// Loop back to handle next phase (e.g. victory or next encounter)
			await handleMultiplayerPhase(state);
		};

		const controller = createCombatPlaybackController(state, combatState.logs, effects);
		scene.combatRunner = controller;
	}
}
