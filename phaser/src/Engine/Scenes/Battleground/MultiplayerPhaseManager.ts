import { State, getCurrentScene } from "@Models/State";
import { getPhaseOptions, sendOptionSelection } from "@Multiplayer/MultiplayerManager";
import * as Encounter from "@Systems/Encounter";
import { createBrowserCombatEffects } from "@Scenes/Battleground/BrowserCombatEffects";
import { createCombatPlaybackController } from "@Scenes/Battleground/CombatPlaybackController";
import { getAllCharas, getUnit, destroy, hasCharaById, create as createChara, enableTooltip, summon, getCharaById } from "@Systems/Chara/Chara";
import { FORCE_ID_PLAYER, FORCE_ID_CPU, SCREEN_HEIGHT, SCREEN_WIDTH } from "@Constants/constants";
import { BattlegroundScene } from "@Scenes/Battleground/BattlegroundScene";
import { setIsInputEnabled, setEnemyBoardVisible } from "@Models/Board";
import * as ResultsUI from "@Scenes/Battleground/Results/ResultsUI";
import * as Animations from "@Systems/Chara/Animations";
import * as ForceStats from "@Scenes/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import { resetUnitStats } from "@Models/Entities/Unit";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import { getBattleCore, getCardDefinition } from "@Models/Entities/Card";
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
import { createUIButton } from "@Components/UIButton";
import { vec2 } from "@Models/Geometry";
import { t } from "@i18n/i18n";
import type { ActionPayload, PhaseOption, CombatState, PhaseOptions } from "@Core/Types";
import { resetBoard } from "@Scenes/Battleground/PhaseManager";
import { updateMultiplayerPlayerNamesDisplay } from "@UI/components/multiplayerPlayerNamesDisplay";

const logger = createLogger("MultiplayerPhaseManager");

type PhaseOptionsResult = Omit<PhaseOptions, "round"> & { round?: number };

export type PhaseTransport = {
	getPhaseOptions: (state: State) => Promise<PhaseOptionsResult>;
	sendOptionSelection: (optionId: string, payload?: ActionPayload) => Promise<boolean>;
};

export type MultiplayerPhaseContext = {
	showReadyOnInitialCombat?: boolean;
	isInitialCall?: boolean;
};

const defaultMultiplayerTransport: PhaseTransport = {
	getPhaseOptions,
	sendOptionSelection,
};

export async function handleMultiplayerPhase(
	state: State,
	transport: PhaseTransport = defaultMultiplayerTransport,
	context: MultiplayerPhaseContext = {}
) {
	logger.debug("Starting Multiplayer Phase handling...");
	const isInitialCall = context.isInitialCall ?? true;
	const childContext: MultiplayerPhaseContext = {
		showReadyOnInitialCombat: context.showReadyOnInitialCombat || false,
		isInitialCall: false,
	};
	const result = await transport.getPhaseOptions(state);

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

		const previousUnitIds = new Set(state.session.team.units.map((u) => u.id));
		state.session.team.units = serverUnits;

		if (result.phase !== "combat") {
			setEnemyBoardVisible(false);

			// Remove charas for units no longer on the team (handles sold units and
			// stale shop-preview charas left over after slideOut).
			const newUnitIdSet = new Set(state.session.team.units.map((u) => u.id));
			getAllCharas()
				.filter((c) => !newUnitIdSet.has(getUnit(c).id))
				.forEach(destroy);

			// Only create charas for units that aren't already displayed.
			// Newly summoned units (pre-placed by the controller) are skipped so
			// they don't flicker; genuinely new units get the summon effect.
			await Promise.all(
				state.session.team.units.map(async (u) => {
					if (hasCharaById(u.id)) return;
					if (!previousUnitIds.has(u.id)) {
						await summon(u, true);
					} else {
						const c = await createChara(u);
						enableTooltip(c);
					}
				})
			);

			// Slide the shop out after new units have appeared on board.
			// This runs for any phase transition (shop → shop, shop → encounter, etc.)
			// so the shop is always cleaned up before the next phase renders.
			if (ShopPanel.isVisible()) {
				await ShopPanel.slideOut();
			}
		}
	}

	if (result.phase !== "combat") {
		updateMultiplayerPlayerNamesDisplay({ enemyName: "" });
	}

	switch (result.phase) {
		case "combat":
			if (result.combatState) {
				const shouldRequireReady =
					isInitialCall && Boolean(context.showReadyOnInitialCombat);
				await handleMultiplayerCombat(state, result.combatState, shouldRequireReady, transport, childContext);
			} else {
				logger.error("Multiplayer Combat Phase missing combatState!");
				const combatOption = result.options[0];
				// Auto-skip
				await transport.sendOptionSelection(combatOption.id);
				await handleMultiplayerPhase(state, transport, childContext);
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

			await renderTavernCharas(cardDefs);

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
					await transport.sendOptionSelection("apply_orb", {
						orbId,
						targetUnitId: targetId,
						team: state.session.team,
					});
				}
			);
			// After orb shop completes, notify server and get next phase
			await transport.sendOptionSelection("orb_shop_done");
			await handleMultiplayerPhase(state, transport, childContext);
			break;

		case "upgrade_core":
			const upgradeIds = result.options.map((o: PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
			// After upgrade completes, notify server and get next phase
			await transport.sendOptionSelection("upgrade_core_done");
			await handleMultiplayerPhase(state, transport, childContext);
			break;

		case "add_reaction_core":
			const reactionIds = result.options.map((o: PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("effectCardShop.title", reactionIds);
			// After reaction card completes, notify server and get next phase
			await transport.sendOptionSelection("add_reaction_core_done");
			await handleMultiplayerPhase(state, transport, childContext);
			break;

		case "victory":
			await ResultsUI.displayGameCompleteResults(state, false);
			await ResultsUI.slideIn();
			break;

		case "game_over":
			await ResultsUI.displayGameCompleteResults(state, true);
			await ResultsUI.slideIn();
			break;

		default:
			logger.warn(`Unknown multiplayer phase: ${result.phase}`);
			break;
	}
}

async function handleMultiplayerCombat(
	state: State,
	combatState: CombatState,
	requireReadyButton: boolean,
	transport: PhaseTransport,
	childContext: MultiplayerPhaseContext
) {
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

	getAllCharas().forEach(destroy);
	for (const u of state.battleData.units) {
		const c = await createChara(u);
		enableTooltip(c);
	}

	const scene = getCurrentScene() as BattlegroundScene;
	updateMultiplayerPlayerNamesDisplay({
		enemyName: combatState.enemyPlayerName || "CPU",
	});

	const startCombatPlayback = async () => {
		// Keep current pacing for transitions into playback.
		await delay(300);

		const effects = createBrowserCombatEffects();
		effects.onCombatEnd = async (state, outcome, combatStates) => {
			setIsInputEnabled(true);
			if (outcome === "player_lost") {
				const core = getBattleCore(state)(FORCE_ID_PLAYER);
				if (core) {
					await Animations.shatter(getCharaById(core.id));
				}
			} else if (outcome === "player_won") {
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

			// Reset visual state on the battleData player units (charge bars reference these objects)
			state.battleData.units
				.filter((u) => u.force === FORCE_ID_PLAYER)
				.forEach((u) => {
					resetUnitStats(u);
					ChargeBarDisplay.updateChargeBar(u.id);
				});

			const resultType = outcome === "player_lost" ? "defeat" : "victory";

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
						resetBoard(true).then(() =>
							transport
								.sendOptionSelection("combat_done")
								.then(() => handleMultiplayerPhase(state, transport, childContext))
						);
					},
					() => {
						// Replay Callback
						resolve();
						// Restart combat immediately
						handleMultiplayerCombat(state, combatState, false, transport, childContext);
					}
				);
				ResultsUI.slideIn();
			});
		};

		state.battleData.units.forEach(resetUnitStats);
		const controller = createCombatPlaybackController(state, combatState.logs, effects);
		scene.combatRunner = controller;
	};

	if (requireReadyButton) {
		const readyButton = createUIButton(
			t("ui.ready"),
			vec2(SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100),
			() => {
				readyButton.container.destroy();
				void startCombatPlayback();
			}
		);
		readyButton.container.setDepth(1000);
		return;
	}

	await startCombatPlayback();
}
