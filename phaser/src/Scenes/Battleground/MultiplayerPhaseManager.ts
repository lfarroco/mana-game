import { State, getCurrentScene } from "@Models/State";
import { MultiplayerManager } from "../../Multiplayer/MultiplayerManager";
import * as Encounter from "./Systems/Encounter";
import * as HeroShop from "./Systems/Shop/HeroShop";
import * as EffectCardShop from "./Systems/Shop/EffectCardShop";
import { showMatchResult } from "./Systems/MatchResultSystem";
import { createBrowserCombatEffects } from "./BrowserCombatEffects";
import { createCombatPlaybackController } from "./CombatPlaybackController";
import { clearAll, create as createChara, enableTooltip } from "@Systems/Chara/Chara";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, SCREEN_WIDTH, SCREEN_HEIGHT } from "@Constants/constants";
import { createUIButton } from "../../Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { BattlegroundScene } from "./BattlegroundScene";
import { setIsInputEnabled } from "@Models/Board";
import * as ResultsUI from "./Results/ResultsUI";
import * as Animations from "@Systems/Chara/Animations";
import * as ForceStats from "./ForceStats";
import * as CombatSystemStates from "./Systems/CombatSystemStates";
import { resetUnitStats } from "@Models/Entities/Unit";
import { getBattleCore } from "@Models/Entities/Card";
import { getCharaById } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import { openOrbShop } from "./Systems/Shop/OrbShop";
import { updateLivesDisplay } from "@UI/components/livesDisplay";
import { updateRoundDisplay } from "@UI/components/roundDisplay";
import { updateWinsDisplay } from "@UI/components/winsDisplay";


export async function handleMultiplayerPhase(state: State) {
	console.log("Starting Multiplayer Phase handling...");
	const result = await MultiplayerManager.getInstance().getPhaseOptions(state);

	console.log(`Multiplayer Phase: ${result.phase}`);

	// Sync Team State and Stats from Server
	if (result.round !== undefined) {
		console.log(`Syncing round: ${result.round}`);
		state.gameData.round = result.round;
		updateRoundDisplay(state.gameData.round);
	}
	if (result.wins !== undefined) {
		state.gameData.player.wins = result.wins;
		updateWinsDisplay(state.gameData.player.wins);
	}
	if (result.losses !== undefined) {
		state.gameData.player.losses = result.losses;
		state.gameData.player.lives = 4 - result.losses;
		updateLivesDisplay(state.gameData.player.lives);
	}

	if (result.team && result.team.units) {
		console.log("Syncing team from server...", result.team.units.length);
		const serverUnits = result.team.units;

		state.gameData.player.units = serverUnits;

		if (result.phase !== "combat") {
			clearAll();
			await Promise.all(state.gameData.player.units.map(async u => {
				const c = await createChara(u);
				enableTooltip(c);
			}));
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
			await HeroShop.openHeroShop(undefined, undefined, shopCardIds);
			await MultiplayerManager.getInstance().sendOptionSelection("shop_skip");
			await handleMultiplayerPhase(state);
			break;

		case "orb_shop":
			const orbOptions = result.options;
			if (!orbOptions || orbOptions.length === 0) {
				console.warn("Orb Shop options missing");
				return;
			}
			console.log("Opening Orb Shop with options:", orbOptions);
			await openOrbShop(
				state,
				orbOptions.map((o: any) => o.id),
				async (orbId, targetId) => {
					console.log(`Sending Orb Apply: ${orbId} -> ${targetId}`);
					await MultiplayerManager.getInstance().sendOptionSelection('apply_orb', { orbId, targetUnitId: targetId });
				}
			);
			await handleMultiplayerPhase(state);
			break;

		case "upgrade_core":
			const upgradeIds = result.options.map(o => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
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

		let allUnits = [];
		if (combatState.units) {
			// Deep clone units to ensure replay starts with fresh state
			allUnits = JSON.parse(JSON.stringify(combatState.units));
		} else {
			const playerUnits = state.gameData.player.units;
			const enemyUnits = combatState.enemyTeam;
			playerUnits.forEach(u => u.force = FORCE_ID_PLAYER);
			allUnits = [...playerUnits, ...enemyUnits];
		}

		state.battleData.units = allUnits;

		setIsInputEnabled(false);

		clearAll();
		for (const u of state.battleData.units) {
			const c = await createChara(u);
			enableTooltip(c);
		}

		const scene = getCurrentScene() as BattlegroundScene;

		await new Promise<void>((resolve) => {
			const btn = createUIButton(t("ui.ready"), vec2(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100), () => {
				btn.container.destroy();
				resolve();
			});
		});

		const effects = createBrowserCombatEffects();
		effects.onCombatEnd = async (state, outcome, combatStates) => {
			setIsInputEnabled(true);
			if (outcome === "player_lost") {
				const core = getBattleCore(state)(FORCE_ID_PLAYER);
				if (core) {
					await Animations.shatter(getCharaById(core.id));
				}
			} else {
				const core = getBattleCore(state)(FORCE_ID_CPU);
				if (core) {
					await Animations.shatter(getCharaById(core.id));
				}
			}

			await delay(300);

			if (combatStates) {
				let forceStatsState = combatStates.forceStatsState;
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, FORCE_ID_CPU);
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, FORCE_ID_PLAYER);
				CombatSystemStates.updateForceStatsState(forceStatsState);
			}
			state.gameData.player.units.forEach(resetUnitStats);

			const resultType = outcome === "player_won" ? "victory" : "defeat";

			// Optimistically update top bar stats
			if (resultType === "victory") {
				updateWinsDisplay((state.gameData.player.wins || 0) + 1);
			} else {
				updateLivesDisplay((state.gameData.player.lives || 4) - 1);
			}

			await new Promise<void>((resolve) => {
				ResultsUI.displayResults(
					state,
					resultType,
					() => {
						// Continue Callback
						resolve();
						// Proceed to next phase
						MultiplayerManager.getInstance().sendOptionSelection("combat_done")
							.then(() => handleMultiplayerPhase(state));
					},
					() => {
						// Replay Callback
						resolve();
						// Restart combat
						handleMultiplayerCombat(state, combatState);
					}
				);
				ResultsUI.slideIn();
			});
		};

		const controller = createCombatPlaybackController(state, combatState.logs, effects);
		scene.combatRunner = controller;
	}
}

