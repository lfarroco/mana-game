import { State, getCurrentScene } from "@Models/State";
import { getPhaseOptions, sendOptionSelection } from "@Multiplayer/MultiplayerManager";
import * as Encounter from "@Systems/Encounter";
import { showMatchResult } from "@Systems/MatchResultSystem";
import { createBrowserCombatEffects } from "@Scenes/Battleground/BrowserCombatEffects";
import { createCombatPlaybackController } from "@Scenes/Battleground/CombatPlaybackController";
import { clearAll, create as createChara, enableTooltip } from "@Systems/Chara/Chara";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, SCREEN_WIDTH, SCREEN_HEIGHT } from "@Constants/constants";
import { createUIButton } from "@Components/UIButton";
import { t } from "@i18n/i18n";
import { vec2 } from "@Models/Geometry";
import { BattlegroundScene } from "@Scenes/Battleground/BattlegroundScene";
import { setIsInputEnabled, setEnemyBoardVisible } from "@Models/Board";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import * as Animations from "@Systems/Chara/Animations";
import * as ForceStats from "@Scenes/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { resetUnitStats } from "@Models/Entities/Unit";
import { getBattleCore, getCardDefinition } from "@Models/Entities/Card";
import { getCharaById } from "@Systems/Chara/Chara";
import { delay } from "@Utils/animation";
import { openOrbShop } from "@Systems/Shop/OrbShop";
import { updateLivesDisplay } from "@UI/components/livesDisplay";
import { updateRoundDisplay } from "@UI/components/roundDisplay";
import { updateWinsDisplay } from "@UI/components/winsDisplay";
import { renderTavernCharas } from "@Systems/Shop/CharaShop";
import * as ShopPanel from "@Systems/Shop/ShopPanel";
import { getGameController } from "@Core/GameControllerFactory";
import * as EffectCardShop from "@Systems/Shop/EffectCardShop";
import { createLogger } from "@Utils/Logger";
import { PhaseOption, CombatState } from "@Core/Types";

const logger = createLogger("MultiplayerPhaseManager");

export async function handleMultiplayerPhase(state: State) {
	logger.debug("Starting Multiplayer Phase handling...");
	const result = await getPhaseOptions(state);

	logger.debug(`Multiplayer Phase: ${result.phase}`);

	// Sync phase from server
	state.session.phase = result.phase;
	state.session.current_options = {
		options: result.options || [],
		combatState: result.combatState,
	};

	// Sync Team State and Stats from Server
	if (result.round !== undefined) {
		logger.debug(`Syncing round: ${result.round}`);
		state.session.round = result.round;
		updateRoundDisplay(state.session.round);
	}
	// Don't sync wins/losses when entering combat phase, since the combat hasn't been shown yet
	// The optimistic update after combat will handle the display, and the next phase will sync correctly
	if (result.phase !== "combat") {
		if (result.wins !== undefined) {
			state.session.wins = result.wins;
			updateWinsDisplay(state.session.wins);
		}
		if (result.losses !== undefined) {
			state.session.losses = result.losses;
			updateLivesDisplay(4 - state.session.losses);
		}
	}

	if (result.team && result.team.units) {
		logger.debug("Syncing team from server...", result.team.units.length);
		const serverUnits = result.team.units;

		state.session.team.units = serverUnits;

		if (result.phase !== "combat") {
			clearAll();
			await Promise.all(
				state.session.team.units.map(async (u) => {
					const c = await createChara(u);
					enableTooltip(c);
				})
			);
		}
	}

	switch (result.phase) {
		case "combat":
			if (result.combatState) {
				await handleMultiplayerCombat(state, result.combatState);
			} else {
				logger.error("Multiplayer Combat Phase missing combatState!");
				const combatOption = result.options[0];
				// Auto-skip
				await sendOptionSelection(combatOption.id);
				await handleMultiplayerPhase(state);
			}
			break;

		case "encounter":
			const encounterIds = result.options.map((o: PhaseOption) => o.id);
			await Encounter.open(state, encounterIds);
			break;

		case "shop":
			const shopCardIds = result.options.map((o: PhaseOption) => o.id);
			const cardDefs = shopCardIds.map((id: string) => getCardDefinition(id)).filter(Boolean);
			const controller = getGameController();

			ShopPanel.create(async () => {
				await ShopPanel.slideOut();
				await controller.skipPhase();
			});

			renderTavernCharas(cardDefs);

			await ShopPanel.slideIn();
			break;

		case "orb_shop":
			const orbOptions = result.options;
			if (!orbOptions || orbOptions.length === 0) {
				logger.warn("Orb Shop options missing");
				return;
			}
			logger.debug("Opening Orb Shop with options:", orbOptions);
			await openOrbShop(
				state,
				orbOptions.map((o: PhaseOption) => o.id),
				async (orbId, targetId) => {
					logger.debug(`Sending Orb Apply: ${orbId} -> ${targetId}`);
					await sendOptionSelection("apply_orb", {
						orbId,
						targetUnitId: targetId,
						team: state.session.team,
					});
				}
			);
			// After orb shop completes, notify server and get next phase
			await sendOptionSelection("orb_shop_done");
			await handleMultiplayerPhase(state);
			break;

		case "upgrade_core":
			const upgradeIds = result.options.map((o: PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
			// After upgrade completes, notify server and get next phase
			await sendOptionSelection("upgrade_core_done");
			await handleMultiplayerPhase(state);
			break;

		case "add_reaction_core":
			const reactionIds = result.options.map((o: PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("effectCardShop.title", reactionIds);
			// After reaction card completes, notify server and get next phase
			await sendOptionSelection("add_reaction_core_done");
			await handleMultiplayerPhase(state);
			break;

		case "victory":
			await showMatchResult(true);
			break;

		case "game_over":
			await showMatchResult(false);
			break;

		default:
			logger.warn(`Unknown multiplayer phase: ${result.phase}`);
			break;
	}

	async function handleMultiplayerCombat(state: State, combatState: CombatState) {
		logger.debug("Initializing Multiplayer Combat:", combatState);

		// Disable board input immediately - combat outcome is pre-calculated
		setIsInputEnabled(false);

		let allUnits = [];
		if (combatState.units) {
			// Deep clone units to ensure replay starts with fresh state
			allUnits = JSON.parse(JSON.stringify(combatState.units));
		} else {
			const playerUnits = state.session.team.units;
			const enemyUnits = combatState.enemyTeam;
			playerUnits.forEach((u) => (u.force = FORCE_ID_PLAYER));
			allUnits = [...playerUnits, ...enemyUnits];
		}

		state.battleData.units = allUnits;

		setEnemyBoardVisible(true);

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
			setEnemyBoardVisible(false);
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
			state.session.team.units.forEach(resetUnitStats);

			const resultType = outcome === "player_won" ? "victory" : "defeat";

			// Optimistically update top bar display only (not state)
			// The state will be synced from server on next phase transition
			if (resultType === "victory") {
				updateWinsDisplay((state.session.wins || 0) + 1);
			} else {
				updateLivesDisplay(4 - (state.session.losses || 0) - 1);
			}

			await new Promise<void>((resolve) => {
				ResultsUI.displayResults(
					state,
					resultType,
					() => {
						// Continue Callback
						resolve();
						// Proceed to next phase
						sendOptionSelection("combat_done").then(() => handleMultiplayerPhase(state));
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
