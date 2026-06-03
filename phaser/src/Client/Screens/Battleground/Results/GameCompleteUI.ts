import * as UIButton from "Client/Components/UIButton";
import * as Geometry from "@Models/Geometry";
import * as environment from "@Utils/environment";
import * as State from "@Models/State";
import * as Unit from "@Models/Entities/Unit";
import * as AudioManager from "@Systems/AudioManager";
import * as AchievementSystem from "@Systems/AchievementSystem";
import * as deleteSavedData from "@Game/effects/deleteSavedData";
import * as ResultsConfig from "Client/Screens/Battleground/Results/ResultsConfig";
import * as io from "@PhaserIO";
import * as StatsStore from "@Models/StatsStore";
import * as i18n from "@i18n/i18n";
import * as RunStatsPanel from "@Screens/Battleground/Components/UI/RunStatsPanel";
import * as constants from "@Constants/constants";
import * as Config from "@config";

export async function displayGameComplete(
	state: State.State,
	wins: number,
	units: Unit.Unit[],
	isGameOver: boolean,
	nextPhaseCallback?: () => void,
	onComplete?: () => void
): Promise<Phaser.GameObjects.Container> {
	const complete = typeof onComplete === "function" ? onComplete : undefined;

	deleteSavedData.deleteSavedData();

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

	if (true) {
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
		StatsStore.recordRunStats(state.session.runStats || defaultRunStats);

		StatsStore.save();
	}

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
		[
			i18n.t("results.buttons.new_run"),
			async () => {


				State.resetState();
				complete?.();
				//const currentScene = getCurrentScene();
				// currentScene.scene.stop(SCENE_KEYS.BATTLEGROUND);
				// currentScene.game.scene.start(SCENE_KEYS.CRYSTAL_SELECTION);
			},
		],
		[
			i18n.t("results.buttons.main_menu"),
			async () => {
				State.resetState();
				complete?.();
				// const currentScene = getCurrentScene();
				// currentScene.scene.stop(SCENE_KEYS.BATTLEGROUND);
				// currentScene.game.scene.start(SCENE_KEYS.TITLE);
			},
		]
	);

	// Infinite mode button - disabled in demo and when not enabled by controller
	if (
		wins >= ResultsConfig.INFINITE_MODE_THRESHOLD &&
		nextPhaseCallback &&
		!isGameOver &&
		!Config.IS_DEMO
	) {
		buttonDefinitions.push([
			i18n.t("results.buttons.infinite_mode"),
			async () => {
				const { slideOut } = await import("./ResultsUI");
				await slideOut();

				AudioManager.playMusic("music_battlemap_vetruv");
				nextPhaseCallback();
				complete?.();
			},
		]);
	}

	const buttons = buttonDefinitions.map(
		([label, callback], i) =>
			UIButton.createUIButton({
				text: label,
				position: Geometry.vec2(panelX, panelY + 50 + i * 100),
				callback: callback,
			}).container
	);

	const statsPanel = RunStatsPanel.createRunStatsPanel(state.session.runStats);

	const container = io.Container([
		statsPanel,
		io.BorderedRoundRect(
			Geometry.vec2(panelX, panelY),
			Geometry.size(panelWidth, panelHeight),
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		),
		[
			() =>
				io.Text(i18n.t("results.wins_title", { count: wins.toString() }), {
					...constants.titleTextConfig,
					fontSize: ResultsConfig.RESULTS_FONT_SIZES.titleExtraLarge,
					color: "#FFFFFF",
				}),
			(text) => io.SetPosition(text, Geometry.vec2(panelX, panelY - 250)),
			(text) => io.Centralize(text),
		],
		[
			() => io.Title1(isDemoComplete ? i18n.t("demo.complete.title") : message).setColor(color),
			(title) => io.SetPosition(title, Geometry.vec2(panelX, panelY - 150)),
			(title) => io.Centralize(title),
		],
		[
			() => io.Label(subtitleText),
			(label) => io.SetPosition(label, Geometry.vec2(panelX, panelY - 50)),
			(label) => io.Centralize(label),
		],

		...buttons,
	]);

	if (!environment.isElectron() && !isGameOver && wins >= ResultsConfig.GOLD_VICTORY_THRESHOLD) {
		const wishlistPanelHeight = 150;
		const wishlistPanelY = panelY + panelHeight / 2 + 15 + wishlistPanelHeight / 2;

		const wishlistBg = io.BorderedRoundRect(
			Geometry.vec2(panelX, wishlistPanelY),
			Geometry.size(panelWidth, wishlistPanelHeight),
			ResultsConfig.RESULTS_PANEL.borderRadius,
			ResultsConfig.RESULTS_PANEL.backgroundColor,
			ResultsConfig.RESULTS_PANEL.backgroundAlpha
		);

		const wishlistText = io
			.Label(i18n.t("results.messages.wishlist"))
			.setPosition(panelX, wishlistPanelY - 30)
			.setOrigin(0.5);

		const btn = UIButton.createUIButton({
			text: i18n.t("results.buttons.wishlist"),
			position: Geometry.vec2(panelX, wishlistPanelY + 30),
			callback: async () => {
				window.open("https://store.steampowered.com/app/3757600/Mana_Battle", "_blank");
			},
			width: 400,
		});
		container.add([wishlistBg, wishlistText, btn.container]);
	}

	return container;
}
