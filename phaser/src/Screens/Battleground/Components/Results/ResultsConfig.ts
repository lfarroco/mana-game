import * as i18n from "@i18n/i18n";
import * as constants from "@Constants";
import * as GameConstants from "@game/Constants";

export const LEFT_PANEL_X = 450;
export const RIGHT_PANEL_X = constants.SCREEN_WIDTH - LEFT_PANEL_X;

export const WINS_TO_WIN_GAME = GameConstants.WINS_TO_WIN_GAME;
export const INFINITE_MODE_THRESHOLD = GameConstants.INFINITE_MODE_THRESHOLD;

export const GOLD_VICTORY_THRESHOLD = GameConstants.GOLD_VICTORY_THRESHOLD;
export const SILVER_VICTORY_THRESHOLD = GameConstants.SILVER_VICTORY_THRESHOLD;
export const BRONZE_VICTORY_THRESHOLD = GameConstants.BRONZE_VICTORY_THRESHOLD;

export const RESULTS_COLORS = {
	victory: "#4CAF50",
	defeat: "#F44336",
	gameWon: "#FFD700",
	white: "#FFFFFF",
	gold: "#FFD700",
	silver: "#C0C0C0",
	bronze: "#CD7F32",
} as const;

export const RESULTS_FONT_SIZES = {
	titleLarge: "48px",
	titleMedium: "36px",
	titleSmall: "24px",
	titleExtraLarge: "64px",
	messageLarge: "20px",
	messageMedium: "16px",
	messageSmall: "22px",
} as const;

export const RESULTS_SPACING = {
	titleY: 50,
	titleYLarge: 50,
	messageY: 100,
	messageYLarge: 120,
	buttonSpacing: 100,
	buttonBottomOffset: 60,
	buttonBottomOffsetLarge: 80,
	panelPadding: 60,
	panelPaddingLarge: 80,
} as const;

export const RESULTS_PANEL = {
	width: 480,
	height: 400,
	borderRadius: 20,
	backgroundColor: 0x2c3e50,
	backgroundAlpha: 0.95,
	overlayColor: 0x000000,
	overlayAlpha: 0.7,
} as const;

export const END_GAME_MESSAGES = {
	infinite: (wins: number) => i18n.t("results.messages.infinite", { wins: wins.toString() }),
	gold: i18n.t("results.messages.gold"),
	silver: i18n.t("results.messages.silver"),
	bronze: i18n.t("results.messages.bronze"),
	default: i18n.t("results.messages.default"),
};

export type VictoryTier = {
	message: string;
	color: string;
};

export function getVictoryTier(wins: number, isGameOver: boolean): VictoryTier {
	if (wins >= GOLD_VICTORY_THRESHOLD) {
		if (isGameOver) {
			return { message: i18n.t("results.victory.run_complete"), color: RESULTS_COLORS.defeat };
		}
		return { message: i18n.t("results.victory.gold"), color: RESULTS_COLORS.gold };
	}

	if (wins >= SILVER_VICTORY_THRESHOLD) {
		return { message: i18n.t("results.victory.silver"), color: RESULTS_COLORS.silver };
	}

	if (wins >= BRONZE_VICTORY_THRESHOLD) {
		return { message: i18n.t("results.victory.bronze"), color: RESULTS_COLORS.bronze };
	}

	return { message: "", color: RESULTS_COLORS.white };
}
