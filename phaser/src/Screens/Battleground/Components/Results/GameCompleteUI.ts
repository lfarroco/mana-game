import * as UIButton from "@Components/Button/UIButton";
import * as environment from "@Utils/environment";
import { Unit } from "@game/Models";
import * as AudioManager from "@Systems/AudioManager";
import * as AchievementSystem from "@Systems/AchievementSystem";
import * as ResultsConfig from "./ResultsConfig";
import * as StatsStore from "@Models/StatsStore";
import * as i18n from "@i18n/i18n";
import * as RunStatsPanel from "@Screens/Battleground/Components/UI/RunStatsPanel";
import * as constants from "@Constants";
import * as Config from "@config";
import { deleteSavedData } from "@Systems/Storage/deleteSavedData";
import { env, makeContainer, borderedRoundRect } from "@Env";
import { BattlegroundEvent } from "../../../../Events";

export async function displayGameComplete(
	wins: number,
	units: Unit[],
	isGameOver: boolean
): Promise<Phaser.GameObjects.Container> {
	await deleteSavedData();

	AudioManager.playMusic("music_playmode", true, 1000);

	const panelWidth = 800;
	const panelHeight = 700;
	const panelX = ResultsConfig.RIGHT_PANEL_X;
	const panelY = constants.MIDDLE_SCREEN_Y;

	const { message, color } = ResultsConfig.getVictoryTier(wins, isGameOver);

	const playerCore = units.find((unit) => unit.isCore);
	if (playerCore && wins >= 5) {
		AchievementSystem.checkVictoryAchievements(wins, playerCore.cardId);
	}

	StatsStore.incrementRunsPlayed();
	if (wins >= ResultsConfig.GOLD_VICTORY_THRESHOLD) {
		StatsStore.recordVictory("gold", playerCore?.cardId);
	} else if (wins >= ResultsConfig.SILVER_VICTORY_THRESHOLD) {
		StatsStore.recordVictory("silver", playerCore?.cardId);
	} else if (wins >= ResultsConfig.BRONZE_VICTORY_THRESHOLD) {
		StatsStore.recordVictory("bronze", playerCore?.cardId);
	}

	if (wins > ResultsConfig.INFINITE_MODE_THRESHOLD) {
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
		unitUsage: {},
	};
	StatsStore.recordRunStats(env.state.session.runStats || defaultRunStats);

	StatsStore.save();

	// Check if demo limit reached
	const isDemoComplete = Config.IS_DEMO && wins >= Config.GAME_CONFIG.MAX_VICTORIES;

	let subtitleText = ResultsConfig.END_GAME_MESSAGES.default;
	if (isDemoComplete) {
		// Demo complete message
		subtitleText = i18n.t("demo.complete.message");
	} else if (isGameOver && wins > ResultsConfig.INFINITE_MODE_THRESHOLD) {
		subtitleText = ResultsConfig.END_GAME_MESSAGES.infinite(wins);
	} else if (wins >= ResultsConfig.GOLD_VICTORY_THRESHOLD) {
		subtitleText = ResultsConfig.END_GAME_MESSAGES.gold;
	} else if (wins >= ResultsConfig.SILVER_VICTORY_THRESHOLD) {
		subtitleText = ResultsConfig.END_GAME_MESSAGES.silver;
	} else if (wins >= ResultsConfig.BRONZE_VICTORY_THRESHOLD) {
		subtitleText = ResultsConfig.END_GAME_MESSAGES.bronze;
	}

	const buttonDefinitions: Array<[string, () => Promise<void>]> = [];

	// Buy Full Game button for demo when limit reached - make it first/primary
	if (isDemoComplete) {
		buttonDefinitions.push([
			i18n.t("demo.buy_full_game"),
			async () => {
				const win = window as Window & { openExternalURL?: (url: string) => void };
				if (win.openExternalURL) {
					win.openExternalURL("https://store.steampowered.com/app/3757600/Mana_Battle");
				} else {
					window.open("https://store.steampowered.com/app/3757600/Mana_Battle", "_blank");
				}
			},
		]);
	}

	// Standard buttons
	buttonDefinitions.push(
		[i18n.t("results.buttons.new_run"), BattlegroundEvent.newRunRequested.emit],
		[i18n.t("results.buttons.main_menu"), BattlegroundEvent.mainMenuRequested.emit]
	);

	// Infinite mode button - disabled in demo
	if (wins >= ResultsConfig.INFINITE_MODE_THRESHOLD && !isGameOver && !Config.IS_DEMO) {
		buttonDefinitions.push([
			i18n.t("results.buttons.infinite_mode"),
			async () => {
				AudioManager.playMusic("music_battlemap_vetruv");
				BattlegroundEvent.combatContinueRequested.emit();
			},
		]);
	}

	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			UIButton.create({
				text: label,
				position: [panelX, panelY + 50 + i * 100],
				callback: callback,
			}).container
	);

	const statsPanel = RunStatsPanel.createRunStatsPanel();

	// Victory title text
	const victoryTitle = env.scene.add
		.text(0, 0, i18n.t("results.wins_title", { count: wins.toString() }), {
			...constants.titleTextConfig,
			fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleExtraLarge,
			color: "#FFFFFF",
		})
		.setOrigin(0.5);
	victoryTitle.setPosition(panelX, panelY - 250);

	// Message text
	const messageText = env.scene.add
		.text(0, 0, isDemoComplete ? i18n.t("demo.complete.title") : message, {
			...constants.titleTextConfig,
			color: color,
		})
		.setOrigin(0.5);
	messageText.setPosition(panelX, panelY - 150);

	// Subtitle text
	const subtitle = env.scene.add
		.text(0, 0, subtitleText, constants.defaultTextConfig)
		.setOrigin(0.5);
	subtitle.setPosition(panelX, panelY - 50);

	const container = makeContainer([
		statsPanel,
		borderedRoundRect(
			env.scene,
			[panelX, panelY],
			[panelWidth, panelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		victoryTitle,
		messageText,
		subtitle,
		...buttons,
	]);

	if (!environment.isElectron() && !isGameOver && wins >= ResultsConfig.GOLD_VICTORY_THRESHOLD) {
		const wishlistPanelHeight = 150;
		const wishlistPanelY = panelY + panelHeight / 2 + 15 + wishlistPanelHeight / 2;

		const wishlistBg = borderedRoundRect(
			env.scene,
			[panelX, wishlistPanelY],
			[panelWidth, wishlistPanelHeight],
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		);

		const wishlistText = env.scene.add
			.text(0, 0, i18n.t("results.messages.wishlist"), constants.defaultTextConfig)
			.setPosition(panelX, wishlistPanelY - 30)
			.setOrigin(0.5);

		const btn = UIButton.create({
			text: i18n.t("results.buttons.wishlist"),
			position: [panelX, wishlistPanelY + 30],
			callback: async () => {
				window.open("https://store.steampowered.com/app/3757600/Mana_Battle", "_blank");
			},
			width: 400,
		});
		container.add([wishlistBg, wishlistText, btn.container]);
	}

	return container;
}
