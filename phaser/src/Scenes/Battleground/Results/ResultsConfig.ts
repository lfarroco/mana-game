export const WINS_TO_WIN_GAME = 10;
export const INFINITE_MODE_THRESHOLD = 10;

export const GOLD_VICTORY_THRESHOLD = 10;
export const SILVER_VICTORY_THRESHOLD = 8;
export const BRONZE_VICTORY_THRESHOLD = 5;

export const RESULTS_DEPTHS = {
	overlay: 1000,
	panel: 1001,
	content: 1001,
	container: 1002,
} as const;

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
	titleY: 30,
	titleYLarge: 50,
	messageY: 80,
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

export const VICTORY_MESSAGES = {
	infinite: (wins: number) => `You've won ${wins} matches so far - keep it up!`,
	standard: "Congratulations! You have won the battle.",
};

export const END_GAME_MESSAGES = {
	infinite: (wins: number) => `You defeated ${wins} teams in your journey, great job!`,
	standard: "You found a solid build! How about trying Infinite Mode?",
};

export type VictoryTier = {
	message: string;
	color: string;
};

export function getVictoryTier(wins: number, isGameOver: boolean): VictoryTier {
	if (wins >= GOLD_VICTORY_THRESHOLD) {
		if (isGameOver) {
			return { message: "Run Complete", color: RESULTS_COLORS.defeat };
		}
		return { message: "Gold Victory", color: RESULTS_COLORS.gold };
	}

	if (wins >= SILVER_VICTORY_THRESHOLD) {
		return { message: "Silver Victory", color: RESULTS_COLORS.silver };
	}

	if (wins >= BRONZE_VICTORY_THRESHOLD) {
		return { message: "Bronze Victory", color: RESULTS_COLORS.bronze };
	}

	return { message: "Better luck next time!", color: RESULTS_COLORS.white };
}
