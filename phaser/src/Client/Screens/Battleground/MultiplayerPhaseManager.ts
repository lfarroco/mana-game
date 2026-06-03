import * as State from "@Models/State";
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
import * as OrbShop from "@Screens/Battleground/Shop/OrbShop";

// TODO: fire events instead?
import * as livesDisplay from "./Components/UI/livesDisplay";
import * as roundDisplay from "./Components/UI/roundDisplay";

import * as winsDisplay from "@Screens/Battleground/Components/UI/winsDisplay";
import * as CharaShop from "@Screens/Battleground/Shop/CharaShop";
import * as ShopPanel from "@Screens/Battleground/Shop/ShopPanel";
import * as EffectCardShop from "@Screens/Battleground/Shop/EffectCardShop";
import * as Logger from "@Utils/Logger";
import * as UIButton from "Client/Components/UIButton";
import * as Geometry from "@Models/Geometry";
import * as i18n from "@i18n/i18n";
import type * as Types from "@Core/Types";
import * as PhaseManager from "Client/Screens/Battleground/PhaseManager";
import * as NameDisply from "@Screens/Battleground/Components/UI/namesDisplay";

const logger = Logger.createLogger("MultiplayerPhaseManager");

type PhaseOptionsResult = Omit<Types.PhaseOptions, "round"> & { round?: number };

export type PhaseTransport = {
	getPhaseOptions: (state: State.State) => Promise<PhaseOptionsResult>;
	sendOptionSelection: (optionId: string, payload?: Types.ActionPayload) => Promise<boolean>;
};



export async function handlePhase() {
	logger.debug("Starting Phase handling...");

	const { session } = state;

	// Sync Team State and Stats from Server
	if (session.round !== undefined) {
		logger.debug(`Syncing round: ${session.round}`);
		roundDisplay.updateRoundDisplay(state.session.round);
	}
	// Don't sync wins/losses when entering combat phase, since the combat hasn't been shown yet
	// The optimistic update after combat will handle the display, and the next phase will sync correctly
	// if (session.phase !== "combat") {
	// 	if (session.wins !== undefined) {
	// 		state.session.wins = session.wins;
	// 		winsDisplay.updateWinsDisplay(state.session.wins);
	// 	}
	// 	if (session.losses !== undefined) {
	// 		state.session.losses = session.losses;
	// 		livesDisplay.updateLivesDisplay(4 - state.session.losses);
	// 	}
	// }


	if (session.phase !== "combat") {
		Board.setEnemyBoardVisible(false);

		// Only create charas for units that aren't already displayed.
		await Promise.all(
			state.session.team.units.map(async (u) => {
				if (Chara.hasCharaById(u.id)) {
					//Chara.refreshUnit(u);
				} else {
					await Chara.summon(u, true);
				}
			})
		);

	}

	if (session.phase !== "combat") {
		NameDisply.updateNameDisplay({ enemyName: "" });
	}

	switch (session.phase) {
		case "encounter":
			const response = await Encounter.displayOptions();
			state.session = response;
			handlePhase();
			break;

		case "shop":
			const shopCardIds = session.current_options.map((o: Types.PhaseOption) => o.id);
			const cardDefs = shopCardIds.map((id: string) => Card.getCardDefinition(id)).filter(Boolean);

			// ShopPanel.create(async () => {
			// 	await ShopPanel.slideOut();
			// 	await GameController.skipPhase();
			// });

			await CharaShop.renderTavernCharas(cardDefs);

			await ShopPanel.SlideIn();
			break;
		case "combat":
			// if (session.combatState) {
			// 	const shouldRequireReady = isInitialCall && Boolean(context.showReadyOnInitialCombat);
			// 	await handleMultiplayerCombat(
			// 		state,
			// 		session.combatState,
			// 		shouldRequireReady,
			// 		transport,
			// 		childContext
			// 	);
			// } else {
			// 	logger.error("Multiplayer Combat Phase missing combatState!");
			// 	const combatOption = session.options[0];
			// 	// Auto-skip
			// 	await transport.sendOptionSelection(combatOption.id);
			// 	await handlePhase(transport, childContext);
			// }
			break;



		case "orb_shop":
			const orbOptions = session.current_options;
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
					// await transport.sendOptionSelection("apply_orb", {
					// 	orbId,
					// 	targetUnitId: targetId,
					// 	team: state.session.team,
					// });
				}
			);
			// After orb shop completes, notify server and get next phase
			//await transport.sendOptionSelection("skip");
			//await handlePhase();
			break;

		case "upgrade_core":
			const upgradeIds = session.current_options.map((o: Types.PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("upgradeCrystal.title", upgradeIds);
			// selection should already return the next phase
			await handlePhase();
			break;

		case "add_reaction_core":
			const reactionIds = session.current_options.map((o: Types.PhaseOption) => o.id);
			await EffectCardShop.openUpgradeCorePhase("effectCardShop.title", reactionIds);
			// After reaction card completes, notify server and get next phase
			// selection should already return the next phase
			await handlePhase();
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
			logger.warn(`Unknown multiplayer phase: ${session.phase}`);
			break;
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

		NameDisply.updateNameDisplay({
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
						await Animations.shatter(Chara.mustGetCharaById(core.id));
					}
				} else if (outcome === "player_won") {
					const core = Card.getBattleCore(state)(constants.FORCE_ID_CPU);
					if (core) {
						await Animations.shatter(Chara.mustGetCharaById(core.id));
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
							PhaseManager.resetBoard(true).then(() => {
								const nextSession = combatState.nextSession;
								if (!nextSession) {
									throw new Error("Missing post-combat session while leaving combat phase");
								}
								state.session = nextSession;
								void handlePhase();
							});
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
}