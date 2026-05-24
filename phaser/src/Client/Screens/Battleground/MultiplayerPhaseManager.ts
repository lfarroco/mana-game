import * as State from "@Models/State";
import * as MultiplayerManager from "@Multiplayer/MultiplayerManager";
import * as Encounter from "@Systems/Encounter";
import * as BrowserCombatEffects from "Client/Screens/Battleground/BrowserCombatEffects";
import * as Chara from "@Systems/Chara/Chara";
import * as constants from "@Constants/constants";
import * as Board from "@Models/Board";
import * as ResultsUI from "Client/Screens/Battleground/Results/ResultsUI";
import * as Animations from "@Systems/Chara/Animations";
import * as ForceStats from "Client/Screens/Battleground/ForceStats";
import * as CombatSystemStates from "@Systems/CombatSystemStates";
import * as Unit from "@Models/Entities/Unit";
import * as ChargeBarDisplay from "@Systems/Chara/ChargeBarDisplay";
import * as Card from "@Models/Entities/Card";
import * as animation from "@Utils/animation";
import * as OrbShop from "@Systems/Shop/OrbShop";

// TODO: fire events instead?
import * as livesDisplay from "./Components/livesDisplay";
import * as roundDisplay from "./Components/roundDisplay";

import * as winsDisplay from "Client/Screens/Battleground/Components/winsDisplay";
import * as CharaShop from "@Systems/Shop/CharaShop";
import * as ShopPanel from "@Systems/Shop/ShopPanel";
import * as GameController from "@Core/GameController";
import * as EffectCardShop from "@Systems/Shop/EffectCardShop";
import * as Logger from "@Utils/Logger";
import * as UIButton from "@Components/UIButton";
import * as Geometry from "@Models/Geometry";
import * as i18n from "@i18n/i18n";
import type * as Types from "@Core/Types";
import * as PhaseManager from "Client/Screens/Battleground/PhaseManager";
import * as playerNamesDisplay from "Client/Screens/Battleground/Components/playerNamesDisplay";

const logger = Logger.createLogger("MultiplayerPhaseManager");

type PhaseOptionsResult = Omit<Types.PhaseOptions, "round"> & { round?: number };

export type PhaseTransport = {
	getPhaseOptions: (state: State.State) => Promise<PhaseOptionsResult>;
	sendOptionSelection: (optionId: string, payload?: Types.ActionPayload) => Promise<boolean>;
};

export type MultiplayerPhaseContext = {
	showReadyOnInitialCombat?: boolean;
	isInitialCall?: boolean;
};

const hasUnitStateChanged = (previousUnit: unknown, nextUnit: unknown): boolean =>
	JSON.stringify(previousUnit) !== JSON.stringify(nextUnit);

const defaultMultiplayerTransport: PhaseTransport = {
	getPhaseOptions: MultiplayerManager.getPhaseOptions,
	sendOptionSelection: MultiplayerManager.sendOptionSelection,
};

export async function handleMultiplayerPhase(
	state: State.State,
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
		roundDisplay.updateRoundDisplay(state.session.round);
	}
	// Don't sync wins/losses when entering combat phase, since the combat hasn't been shown yet
	// The optimistic update after combat will handle the display, and the next phase will sync correctly
	if (result.phase !== "combat") {
		if (result.wins !== undefined) {
			state.session.wins = result.wins;
			winsDisplay.updateWinsDisplay(state.session.wins);
		}
		if (result.losses !== undefined) {
			state.session.losses = result.losses;
			livesDisplay.updateLivesDisplay(4 - state.session.losses);
		}
	}

	if (result.team && result.team.units) {
		logger.debug("Syncing team from server...", result.team.units.length);
		const serverUnits = result.team.units;
		const previousUnitsById = new Map(state.session.team.units.map((unit) => [unit.id, unit]));

		const previousUnitIds = new Set(state.session.team.units.map((u) => u.id));
		state.session.team.units = serverUnits;

		if (result.phase !== "combat") {
			Board.setEnemyBoardVisible(false);

			// Remove charas for units no longer on the team (handles sold units and
			// stale shop-preview charas left over after slideOut).
			const newUnitIdSet = new Set(state.session.team.units.map((u) => u.id));
			Chara.getAllCharas()
				.filter((c) => !newUnitIdSet.has(Chara.getUnit(c).id))
				.forEach(Chara.destroy);

			// Only create charas for units that aren't already displayed.
			// Newly summoned units (pre-placed by the controller) are skipped so
			// they don't flicker; genuinely new units get the summon effect.
			await Promise.all(
				state.session.team.units.map(async (u) => {
					const previousUnit = previousUnitsById.get(u.id);
					if (Chara.hasCharaById(u.id)) {
						if (!previousUnit || !hasUnitStateChanged(previousUnit, u)) return;
						await Chara.refreshUnit(u);
						return;
					}
					if (!previousUnitIds.has(u.id)) {
						await Chara.summon(u, true);
					} else {
						const c = await Chara.create(u);
						Chara.enableTooltip(c);
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
		playerNamesDisplay.update({ enemyName: "" });
	}

	switch (result.phase) {
		case "combat":
			if (result.combatState) {
				const shouldRequireReady = isInitialCall && Boolean(context.showReadyOnInitialCombat);
				await handleMultiplayerCombat(
					state,
					result.combatState,
					shouldRequireReady,
					transport,
					childContext
				);
			} else {
				logger.error("Multiplayer Combat Phase missing combatState!");
				const combatOption = result.options[0];
				// Auto-skip
				await transport.sendOptionSelection(combatOption.id);
				await handleMultiplayerPhase(state, transport, childContext);
			}
			break;

		case "encounter":
			const encounterIds = result.options.map((o: Types.PhaseOption) => o.id);
			await Encounter.open(state, encounterIds);
			break;

		case "shop":
			const shopCardIds = result.options.map((o: Types.PhaseOption) => o.id);
			const cardDefs = shopCardIds.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

			ShopPanel.create(async () => {
				await ShopPanel.slideOut();
				await GameController.skipPhase();
			});

			await CharaShop.renderTavernCharas(cardDefs);

			await ShopPanel.slideIn();
			break;

		case "orb_shop":
			const orbOptions = result.options;
			if (!orbOptions || orbOptions.length === 0) {
				logger.warn("Orb Shop options missing");
				return;
			}
			logger.debug("Opening Orb Shop with options:", orbOptions);
			await OrbShop.openOrbShop(
				state,
				orbOptions.map((o: Types.PhaseOption) => o.id),
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
			const upgradeIds = result.options.map((o: Types.PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
			// After upgrade completes, notify server and get next phase
			await transport.sendOptionSelection("upgrade_core_done");
			await handleMultiplayerPhase(state, transport, childContext);
			break;

		case "add_reaction_core":
			const reactionIds = result.options.map((o: Types.PhaseOption) => o.id);
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
	state: State.State,
	combatState: Types.CombatState,
	requireReadyButton: boolean,
	transport: PhaseTransport,
	childContext: MultiplayerPhaseContext
) {
	logger.debug("Initializing Multiplayer Combat:", combatState);

	// Disable board input immediately - combat outcome is pre-calculated
	Board.setIsInputEnabled(false);

	let allUnits = [];
	if (combatState.units) {
		// Deep clone units to ensure replay starts with fresh state
		allUnits = JSON.parse(JSON.stringify(combatState.units));
	} else {
		const playerUnits = state.session.team.units;
		const enemyUnits = combatState.enemyTeam;
		playerUnits.forEach((u) => (u.force = constants.FORCE_ID_PLAYER));
		allUnits = [...playerUnits, ...enemyUnits];
	}

	state.battleData.units = allUnits;

	Board.setEnemyBoardVisible(true);

	Chara.getAllCharas().forEach(Chara.destroy);
	for (const u of state.battleData.units) {
		const c = await Chara.create(u);
		Chara.enableTooltip(c);
	}

	playerNamesDisplay.update({
		enemyName: combatState.enemyPlayerName || "CPU",
	});

	const startCombatPlayback = async () => {
		// Keep current pacing for transitions into playback.
		await animation.delay(300);

		const effects = BrowserCombatEffects.createBrowserCombatEffects();
		effects.onCombatEnd = async (state, outcome, combatStates) => {
			Board.setIsInputEnabled(true);
			if (outcome === "player_lost") {
				const core = Card.getBattleCore(state)(constants.FORCE_ID_PLAYER);
				if (core) {
					await Animations.shatter(Chara.getCharaById(core.id));
				}
			} else if (outcome === "player_won") {
				const core = Card.getBattleCore(state)(constants.FORCE_ID_CPU);
				if (core) {
					await Animations.shatter(Chara.getCharaById(core.id));
				}
			}

			await animation.delay(300);

			if (combatStates) {
				let forceStatsState = combatStates.forceStatsState;
				forceStatsState = ForceStats.destroyForceStats(forceStatsState, constants.FORCE_ID_CPU);
				forceStatsState = ForceStats.syncPlayerPersistentForceStats(forceStatsState);
				CombatSystemStates.updateForceStatsState(forceStatsState);
			}

			// Reset visual state on the battleData player units (charge bars reference these objects)
			state.battleData.units
				.filter((u) => u.force === constants.FORCE_ID_PLAYER)
				.forEach((u) => {
					Unit.resetUnitStats(u);
					ChargeBarDisplay.updateChargeBar(u.id);
				});

			const resultType = outcome === "player_lost" ? "defeat" : "victory";

			// Optimistically update top bar display only (not state)
			// The state will be synced from server on next phase transition
			if (resultType === "victory") {
				winsDisplay.updateWinsDisplay((state.session.wins || 0) + 1);
			} else {
				livesDisplay.updateLivesDisplay(4 - (state.session.losses || 0) - 1);
			}

			await new Promise<void>((resolve) => {
				ResultsUI.displayResults(
					state,
					resultType,
					() => {
						// Continue Callback
						resolve();
						// Proceed to next phase
						PhaseManager.resetBoard(true).then(() =>
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

		state.battleData.units.forEach(Unit.resetUnitStats);

		// TODO: update this, this was the old way
		//const controller = createCombatPlaybackController(state, combatState.logs, effects);
		//io.scene.combatRunner = controller;
	};

	if (requireReadyButton) {
		const readyButton = UIButton.createUIButton({
			text: i18n.t("ui.ready"),
			position: Geometry.vec2(constants.SCREEN_WIDTH / 2, constants.SCREEN_HEIGHT - 100),
			callback: () => {
				readyButton.container.destroy();
				void startCombatPlayback();
			},
		});
		readyButton.container.setDepth(1000);
		return;
	}

	await startCombatPlayback();
}
