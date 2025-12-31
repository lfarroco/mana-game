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

	switch (result.phase) {
		case "combat":
			if (result.combatState) {
				await handleMultiplayerCombat(state, result.combatState);
			} else {
				console.error("Multiplayer Combat Phase missing combatState!");
				const combatOption = result.options[0];
				// Auto-skip
				await MultiplayerManager.getInstance().sendOptionSelection(combatOption.id, undefined, state);
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
			console.log("Using server-provided full unit list.");
			allUnits = combatState.units;
		} else {
			console.warn("Server did not provide full unit list. Falling back to local player units + enemy team.");
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
			await MultiplayerManager.getInstance().sendOptionSelection("combat_done", undefined, state);
			// Loop back to handle next phase (e.g. victory or next encounter)
			await handleMultiplayerPhase(state);
		};

		const controller = createCombatPlaybackController(state, combatState.logs, effects);
		scene.combatRunner = controller;
	}
}
