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

	const panelWidth = ResultsConfig.RUN_COMPLETE_PANEL.width;
	const panelHeight = ResultsConfig.RUN_COMPLETE_PANEL.height;
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
	// Multiplayer runs end at WINS_TO_WIN_GAME (10) and never continue into
	// Infinite Mode, so a multiplayer gold victory needs its own congratulations.
	const isMultiplayerRun = env.state.session.session_type.type === "multiplayer";

	let subtitleText = ResultsConfig.END_GAME_MESSAGES.default;
	if (isDemoComplete) {
		// Demo complete message
		subtitleText = i18n.t("demo.complete.message");
	} else if (isGameOver && wins > ResultsConfig.INFINITE_MODE_THRESHOLD) {
		subtitleText = ResultsConfig.END_GAME_MESSAGES.infinite(wins);
	} else if (isMultiplayerRun && wins >= ResultsConfig.GOLD_VICTORY_THRESHOLD) {
		subtitleText = i18n.t("results.messages.multiplayer_gold");
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

	// Infinite mode button — single-player only (a multiplayer run ends at
	// WINS_TO_WIN_GAME and the server rejects the "victory" action that
	// infinite mode dispatches on a terminal session — the player can only
	// start a new run).
	if (
		ResultsConfig.shouldOfferInfiniteMode({
			wins,
			isGameOver,
			isDemo: Config.IS_DEMO,
			isMultiplayer: isMultiplayerRun,
		})
	) {
		buttonDefinitions.push([
			i18n.t("results.buttons.infinite_mode"),
			async () => {
				AudioManager.playMusic("music_battlemap_vetruv");
				BattlegroundEvent.combatContinueRequested.emit();
			},
		]);
	}

	const buttonSpacing = 100;
	const buttonGroupCenterY = panelY + 165;
	const firstButtonY = buttonGroupCenterY - ((buttonDefinitions.length - 1) * buttonSpacing) / 2;

	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			UIButton.create({
				text: label,
				position: [panelX, firstButtonY + i * buttonSpacing],
				callback: callback,
				width: 360,
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
	victoryTitle.setPosition(panelX, panelY - 255);

	// Message text (tier label / demo complete title) — only rendered when non-empty
	const messageLabel = isDemoComplete ? i18n.t("demo.complete.title") : message;
	const hasMessage = messageLabel.length > 0;
	const messageText = hasMessage
		? env.scene.add
				.text(0, 0, messageLabel, {
					...constants.titleTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleMedium,
					color: color,
				})
				.setOrigin(0.5)
				.setPosition(panelX, panelY - 145)
		: null;

	// Subtitle text
	const subtitleY = hasMessage ? panelY - 65 : panelY - 130;
	const subtitle = env.scene.add
		.text(0, 0, subtitleText, constants.defaultTextConfig)
		.setOrigin(0.5);
	subtitle.setPosition(panelX, subtitleY);

	// Divider between the title/message block and the action buttons
	const divider = env.scene.add.rectangle(
		panelX,
		subtitleY + 55,
		panelWidth - 200,
		2,
		0xffffff,
		0.15
	);

	const container = makeContainer([
		// Full-screen dim overlay so content behind the result panels is less visible
		env.centeredRect(
			constants.MIDDLE_SCREEN,
			constants.WHOLE_SCREEN,
			ResultsConfig.RESULTS_PANEL.overlayColor,
			ResultsConfig.RESULTS_PANEL.overlayAlpha
		),
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
		divider,
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
			width: 600,
		});
		container.add([wishlistBg, wishlistText, btn.container]);
	}

	return container;
}
