import { createUIButton } from "../../../Components/UIButton";
import { size, vec2 } from "@Models/Geometry";
import { isElectron } from "@Utils/environment";
import { getCurrentScene, getState, resetState, State } from "@Models/State";
import { Unit } from "@Models/Entities/Unit";
import { playMusic } from "@Systems/AudioManager";
import * as AchievementSystem from "@Systems/AchievementSystem";
import { deleteSavedData } from "../../../Game/effects/deleteSavedData";
import {
	getVictoryTier,
	END_GAME_MESSAGES,
	INFINITE_MODE_THRESHOLD,
	RESULTS_FONT_SIZES,
	RESULTS_PANEL,
	GOLD_VICTORY_THRESHOLD,
	SILVER_VICTORY_THRESHOLD,
	BRONZE_VICTORY_THRESHOLD,
	RIGHT_PANEL_X,
} from "./ResultsConfig";
import * as io from "@PhaserIO";
import * as StatsStore from "@Models/StatsStore";
import { t } from "@i18n/i18n";
import { createRunStatsPanel } from "@UI/RunStatsPanel";
import { MIDDLE_SCREEN_Y, SCENE_KEYS, titleTextConfig } from "@Constants/constants";
import { IS_DEMO, GAME_CONFIG } from "../../../config";
import { MultiplayerManager } from "../../../Multiplayer/MultiplayerManager";

export async function displayGameComplete(
	_state: State,
	wins: number,
	units: Unit[],
	isGameOver: boolean,
	nextPhaseCallback?: () => void
): Promise<Phaser.GameObjects.Container> {
	deleteSavedData();

	playMusic("music_playmode", true, 1000);

	const panelWidth = 800;
	const panelHeight = 700;
	const panelX = RIGHT_PANEL_X;
	const panelY = MIDDLE_SCREEN_Y;

	const { message, color } = getVictoryTier(wins, isGameOver);

	const playerCore = units.find((unit) => unit.isCore);
	if (playerCore && wins >= 5) {
		AchievementSystem.checkVictoryAchievements(wins, playerCore.cardId);
	}

	if (true) {
		StatsStore.incrementRunsPlayed();
		if (wins >= GOLD_VICTORY_THRESHOLD) {
			StatsStore.recordVictory("gold", playerCore?.cardId);
		} else if (wins >= SILVER_VICTORY_THRESHOLD) {
			StatsStore.recordVictory("silver", playerCore?.cardId);
		} else if (wins >= BRONZE_VICTORY_THRESHOLD) {
			StatsStore.recordVictory("bronze", playerCore?.cardId);
		}

		if (wins > INFINITE_MODE_THRESHOLD) {
			StatsStore.updateFurthestInfiniteRound(wins);
		}

		const defaultRunStats = {
			damageDealt: 0,
			poisonDealt: 0,
			shieldDealt: 0,
			regenDealt: 0,
			healDealt: 0,
			mostPowerfulUnit: null,
			totalUnitsRecruited: 0,
			unitUsage: {}
		};
		StatsStore.recordRunStats(getState().session.runStats || defaultRunStats);

		StatsStore.save();
	}

	// Check if demo limit reached
	const isDemoComplete = IS_DEMO && wins >= GAME_CONFIG.MAX_VICTORIES;

	let subtitleText = END_GAME_MESSAGES.default;
	if (isDemoComplete) {
		// Demo complete message
		subtitleText = t("demo.complete.message");
	} else if (isGameOver && wins > INFINITE_MODE_THRESHOLD) {
		subtitleText = END_GAME_MESSAGES.infinite(wins);
	} else if (wins >= GOLD_VICTORY_THRESHOLD) {
		subtitleText = END_GAME_MESSAGES.gold;
	} else if (wins >= SILVER_VICTORY_THRESHOLD) {
		subtitleText = END_GAME_MESSAGES.silver;
	} else if (wins >= BRONZE_VICTORY_THRESHOLD) {
		subtitleText = END_GAME_MESSAGES.bronze;
	}

	const buttonDefinitions: Array<[string, () => Promise<void>]> = [];

	// Buy Full Game button for demo when limit reached - make it first/primary
	if (isDemoComplete) {
		buttonDefinitions.push([
			t("demo.buy_full_game"),
			async () => {
				if ((window as any).openExternalURL) {
					(window as any).openExternalURL(
						"https://store.steampowered.com/app/3757600/Mana_Battle"
					);
				} else {
					window.open(
						"https://store.steampowered.com/app/3757600/Mana_Battle",
						"_blank"
					);
				}
			},
		]);
	}

	// Standard buttons
	buttonDefinitions.push(
		[
			t("results.buttons.new_run"),
			async () => {
				if (MultiplayerManager.getInstance().isMultiplayer) {
					await MultiplayerManager.getInstance().sendOptionSelection("combat_done");
				}
				resetState();
				getCurrentScene().game.scene.start(SCENE_KEYS.CRYSTAL_SELECTION);
			},
		],
		[
			t("results.buttons.main_menu"),
			async () => {
				if (MultiplayerManager.getInstance().isMultiplayer) {
					await MultiplayerManager.getInstance().sendOptionSelection("combat_done");
				}
				resetState();
				getCurrentScene().game.scene.start(SCENE_KEYS.TITLE);
			},
		]
	);

	// Infinite mode button - disabled in demo and multiplayer
	if (wins >= INFINITE_MODE_THRESHOLD && nextPhaseCallback && !isGameOver && !IS_DEMO && !MultiplayerManager.getInstance().isMultiplayer) {
		buttonDefinitions.push([
			t("results.buttons.infinite_mode"),
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();

				playMusic("music_battlemap_vetruv");
				nextPhaseCallback();
			},
		]);
	}

	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			createUIButton(
				label,
				vec2(panelX, panelY + 50 + i * 100),
				callback
			).container
	);

	const statsPanel = createRunStatsPanel();

	const container = io.Container([
		statsPanel,
		io.BorderedRoundRect(
			vec2(panelX, panelY),
			size(panelWidth, panelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				io.Text(t("results.wins_title", { count: wins.toString() }), {
					...titleTextConfig,
					fontSize: RESULTS_FONT_SIZES.titleExtraLarge,
					color: "#FFFFFF",
				}),
			(text) => io.SetPosition(text, vec2(panelX, panelY - 250)),
			(text) => io.Centralize(text),
		],
		[
			() => io.Title1(isDemoComplete ? t("demo.complete.title") : message).setColor(color),
			(title) => io.SetPosition(title, vec2(panelX, panelY - 150)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Label(subtitleText),
			(label) => io.SetPosition(label, vec2(panelX, panelY - 50)),
			(label) => io.Centralize(label),
		],

		...buttons,
	]);

	if (!isElectron() && !isGameOver && wins >= GOLD_VICTORY_THRESHOLD) {
		const wishlistPanelHeight = 150;
		const wishlistPanelY = panelY + panelHeight / 2 + 15 + wishlistPanelHeight / 2;

		const wishlistBg = io.BorderedRoundRect(
			vec2(panelX, wishlistPanelY),
			size(panelWidth, wishlistPanelHeight),
			RESULTS_PANEL.borderRadius,
			RESULTS_PANEL.backgroundColor,
			RESULTS_PANEL.backgroundAlpha
		);

		const wishlistText = io.Label(t("results.messages.wishlist"))
			.setPosition(panelX, wishlistPanelY - 30)
			.setOrigin(0.5);

		const btn = createUIButton(
			t("results.buttons.wishlist"),
			vec2(panelX, wishlistPanelY + 30),
			async () => {
				window.open(
					"https://store.steampowered.com/app/3757600/Mana_Battle",
					"_blank"
				);
			},
			400
		);
		container.add([wishlistBg, wishlistText, btn.container]);
	}

	return container;
}
